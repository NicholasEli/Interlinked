import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  Timestamp, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc,
} from 'firebase/firestore';

const boardKey = 'A'.repeat(43);
const wrongKey = 'B'.repeat(43);
const disabledKey = 'C'.repeat(43);
const trailerPath = `boards/${boardKey}/trailers/`;
let environment;

const newTrailer = overrides => ({
  videoId: 'M7lc1UVf-VE', column: 'victoria', watched: false, createdAt: serverTimestamp(), ...overrides,
});

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-interlinked',
    firestore: { rules: await readFile('firestore.rules', 'utf8') },
  });
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'boards', boardKey), { enabled: true });
    await setDoc(doc(db, 'boards', disabledKey), { enabled: false });
  });
});

after(async () => { await environment?.cleanup(); });

test('two signed-out clients can add, read, toggle, and delete from the shared board', async () => {
  const first = environment.unauthenticatedContext().firestore();
  const second = environment.unauthenticatedContext().firestore();
  const victoria = doc(first, `${trailerPath}victoria`);
  const nicholas = doc(second, `${trailerPath}nicholas`);
  await assertSucceeds(setDoc(victoria, newTrailer()));
  await assertSucceeds(setDoc(nicholas, newTrailer({ column: 'nicholas' })));

  const trailers = await assertSucceeds(getDocs(collection(second, `boards/${boardKey}/trailers`)));
  assert.equal(trailers.size, 2);
  assert.ok(trailers.docs.every(entry => entry.data().createdAt instanceof Timestamp));

  await assertSucceeds(updateDoc(doc(second, victoria.path), { watched: true }));
  assert.equal((await getDoc(victoria)).data().watched, true);
  await assertSucceeds(updateDoc(victoria, { watched: false }));
  assert.equal((await getDoc(doc(second, victoria.path))).data().watched, false);
  await assertSucceeds(deleteDoc(doc(first, nicholas.path)));
  assert.equal((await getDoc(nicholas)).exists(), false);
});

test('denies reading, listing, and writing boards and using invalid keys', async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(getDocs(collection(db, 'boards')));
  await assertFails(getDoc(doc(db, 'boards', boardKey)));
  await assertFails(setDoc(doc(db, 'boards', wrongKey), {}));
  await assertFails(getDocs(collection(db, 'boards', wrongKey, 'trailers')));
  await assertFails(getDocs(collection(db, 'boards', disabledKey, 'trailers')));
  await assertFails(getDoc(doc(db, 'boards', wrongKey, 'trailers', 'item')));
  await assertFails(setDoc(doc(db, 'boards', wrongKey, 'trailers', 'item'), newTrailer()));
  await assertFails(setDoc(doc(db, 'boards', 'missing-key', 'trailers', 'item'), newTrailer()));
  await assertFails(getDocs(collection(db, 'trailers')));
});

test('denies invalid records and updates beyond the watched field', async () => {
  const db = environment.unauthenticatedContext().firestore();
  const trailer = doc(db, `${trailerPath}validation`);
  for (const overrides of [
    { videoId: 'invalid' }, { column: 'other' }, { watched: true }, { extra: 1 },
    { watched: 'false' }, { createdAt: Timestamp.fromMillis(0) },
  ]) {
    await assertFails(setDoc(trailer, newTrailer(overrides)));
  }
  await assertFails(setDoc(trailer, { videoId: 'M7lc1UVf-VE' }));
  await assertSucceeds(setDoc(trailer, newTrailer()));
  for (const changes of [
    { watched: 1 }, { column: 'nicholas' }, { videoId: 'dQw4w9WgXcQ' },
    { createdAt: serverTimestamp() }, { extra: 1 },
  ]) {
    await assertFails(updateDoc(trailer, changes));
  }
});
