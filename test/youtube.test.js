import assert from 'node:assert/strict';
import test from 'node:test';
import { getVideoId } from '../src/youtube.js';

const id = 'M7lc1UVf-VE';

test('accepts watch, shortened, and Shorts links', () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${id}&t=50`,
    `http://m.youtube.com/watch?v=${id}`,
    ` https://youtu.be/${id}?si=abc `,
    `https://youtube.com/shorts/${id}/`,
  ]) {
    assert.equal(getVideoId(url), id, url);
  }
});

test('rejects invalid IDs, URLs without videos, and untrusted hosts', () => {
  for (const url of [
    '', 'not-a-url', 'https://youtube.com/watch?v=nope',
    'https://youtube.com/playlist?list=example',
    `https://www.youtube.com.evil.example/watch?v=${id}`,
    `https://evil.example@youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}/extra`, `https://youtu.be/\n${id}`,
    `ftp://youtube.com/watch?v=${id}`, `https:youtube.com/watch?v=${id}`, `javascript:alert('${id}')`,
  ]) {
    assert.equal(getVideoId(url), null, url);
  }
});
