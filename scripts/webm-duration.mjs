/** Add the missing Duration field to the small Segment Info emitted by Chrome.
 * The outer Segment has unknown length, so inserting Info data needs no offset
 * rewrite. This intentionally accepts only the recorder's known container shape.
 */
export function addWebmDuration(buffer, milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0)
    throw new Error('Invalid recording duration');
  const segment = buffer.indexOf(Buffer.from('18538067', 'hex'));
  const info = buffer.indexOf(Buffer.from('1549a966', 'hex'));
  if (
    segment < 0 ||
    info < 0 ||
    buffer.subarray(segment + 4, segment + 12).toString('hex') !==
      '01ffffffffffffff'
  )
    throw new Error('Unsupported WebM Segment');
  const size = buffer[info + 4];
  if (!(size & 0x80) || (size & 0x7f) + 11 >= 127)
    throw new Error('Unsupported WebM Info length');
  const end = info + 5 + (size & 0x7f);
  const duration = Buffer.alloc(11);
  duration.set([0x44, 0x89, 0x88]);
  // Chrome's TimecodeScale is 1,000,000ns (one millisecond).
  if (
    !buffer
      .subarray(info + 5, end)
      .includes(Buffer.from('2ad7b1830f4240', 'hex'))
  )
    throw new Error('Unsupported WebM time scale');
  duration.writeDoubleBE(milliseconds, 3);
  const header = Buffer.from(buffer.subarray(0, end));
  header[info + 4] = 0x80 | ((size & 0x7f) + duration.length);
  return Buffer.concat([header, duration, buffer.subarray(end)]);
}
