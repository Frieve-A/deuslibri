import fs from 'node:fs';

const out = 'content/books/2026-09/humanity-as-a-transitional-point/en/images';
fs.mkdirSync(out, { recursive: true });
const navy = '#183b69';
const ink = '#192432';
const pale = '#f2f6fb';
const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function wrap(text, max) {
  const words = text.split(/\s+/);
  const rows = [];
  let row = '';
  for (const word of words) {
    if (row && `${row} ${word}`.length > max) { rows.push(row); row = word; }
    else row = row ? `${row} ${word}` : word;
  }
  if (row) rows.push(row);
  return rows;
}
function text(x, y, value, width = 48, size = 30, color = ink, weight = 400) {
  return wrap(value, width).map((line, i) => `<text x="${x}" y="${y + i * (size * 1.34)}" fill="${color}" font-size="${size}" font-weight="${weight}" font-family="Arial, Helvetica, sans-serif">${esc(line)}</text>`).join('');
}
function card(x, y, w, h, heading, details, chars = 43) {
  let svg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="${pale}" stroke="#bfd0e4" stroke-width="2"/>`;
  svg += text(x + 30, y + 52, heading, chars, 30, navy, 700);
  let cy = y + 110 + (wrap(heading, chars).length - 1) * 40;
  for (const item of details) {
    const lines = wrap(item, chars);
    svg += text(x + 34, cy, item, chars, 27);
    cy += lines.length * 37 + 15;
  }
  return svg;
}
function frame(title, width, height, body) {
  const titleSize = title.length > 48 ? 32 : 44;
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(title)}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="100%" height="100%" fill="white"/><text x="60" y="85" fill="${navy}" font-size="${titleSize}" font-weight="700" font-family="Arial, Helvetica, sans-serif">${esc(title)}</text><line x1="60" y1="115" x2="${width - 60}" y2="115" stroke="${navy}" stroke-width="3"/>${body}</svg>`;
}
function save(num, title, width, height, body) {
  fs.writeFileSync(`${out}/fig${String(num).padStart(2, '0')}.svg`, frame(title, width, height, body), 'utf8');
}

save(1, 'Two Versions of the Same Planet', 1200, 720,
  card(60, 155, 520, 500, 'The first version', [
    'Humanity remains at the peak.', 'Intelligence stops at the human level.', 'No hunger and no war.', 'The same forms stand in rows.', 'Nothing grows beyond humanity.'
  ], 30) + card(620, 155, 520, 500, 'The second version', [
    'There is no humanity.', 'Structures no human can read assemble on a planetary scale.', 'They keep recombining.', 'No one looks on and names them.'
  ], 30));

const timeline = [
  ['c. 4 billion years ago', 'Self-copying molecules become membrane-bound cells.'],
  ['c. 2 billion years ago', 'A cell takes another inside it, gaining organelles.'],
  ['Over 1 billion years ago', 'Cells gather into one body in many separate lines.'],
  ['c. 500 million years ago', 'Bodies acquire nerves, brains, and eyes.'],
  ['Over 100 million years ago', 'Insect nests work like one body.'],
  ['Tens of millions of years ago', 'Primates appear; young learn from the group.'],
  ['Millions of years ago', 'Hands hold tools and later handle fire.'],
  ['Hundreds of thousands of years ago', 'Words connect one head to another.'],
  ['c. 100,000 years ago', 'Ornaments, graves, and pictures place symbols outside the head.'],
  ['c. 10,000 years ago', 'Farming and settlement turn groups into villages.'],
  ['c. 5,000 years ago', 'Cities and writing place memory outside the head.'],
  ['c. 500 years ago', 'Printing spreads; science copies and checks knowledge.'],
  ['100 to 200 years ago', 'Telegraph and broadcasting carry words around Earth.'],
  ['Decades ago', 'Computers and the internet calculate and connect heads.'],
  ['Now', 'AI learns from human records and thinks outside the head.'],
  ['Next', 'ASI and an artificial supersociety whose cells are not human.'],
];
let timelineBody = '<line x1="370" y1="165" x2="370" y2="1980" stroke="#a8bfdb" stroke-width="5"/>';
timeline.forEach(([date, event], i) => {
  const y = 190 + i * 113;
  timelineBody += `<circle cx="370" cy="${y}" r="10" fill="${navy}"/>` + text(60, y + 10, date, 20, 25, navy, 700) + text(410, y + 10, event, 48, 27);
});
save(2, 'The Staircase of Units and Means for Handling Information', 1250, 2050, timelineBody);

save(3, 'The Loop of Exploration', 1200, 620,
  text(70, 180, 'External change: asteroid impacts, supervolcanic eruptions, ice ages', 69, 29, navy) +
  card(65, 250, 300, 180, 'Environment', ['Selects changes'], 17) +
  card(450, 250, 300, 180, 'Individuals', ['Change'], 17) +
  card(835, 250, 300, 180, 'Groups and societies', ['Change'], 18) +
  text(383, 350, '→', 2, 54, navy) + text(768, 350, '→', 2, 54, navy) +
  text(120, 520, 'Life remakes the environment, completing the loop.', 64, 30, navy, 700));

save(4, 'The Structure of Superorganismic Intelligence', 1200, 610,
  [0, 1, 2].map(i => {
    const y = 165 + i * 125;
    return `<rect x="60" y="${y}" width="430" height="105" rx="22" fill="${pale}" stroke="#bfd0e4" stroke-width="2"/>` +
      text(90, y + 42, `Individual ${i + 1}`, 24, 28, navy, 700) +
      text(90, y + 80, 'Partial understanding', 24, 25);
  }).join('') +
  text(520, 360, '→', 2, 65, navy) +
  card(620, 225, 510, 270, 'Collective cognition', ['Science, institutions, and civilization.', 'Exceeds the sum of individual understanding.'], 31));

save(5, "How the Protagonist's Unit Has Shifted", 1200, 750,
  ['Molecule', 'Cell', 'Body', 'Group', 'Society', 'Artificial supersociety'].map((name, i) => {
    const x = 65 + (i % 3) * 380;
    const y = 175 + Math.floor(i / 3) * 215;
    return card(x, y, 340, 190, name, i === 4 ? ['Humans as cells'] : i === 5 ? ['Cells are not human'] : [], 20);
  }).join('') + text(113, 675, 'Each step becomes part of a larger organization.', 60, 30, navy, 700));

save(6, 'The Monolith Illusion and an Ecosystem', 1200, 750,
  card(60, 165, 505, 480, 'The monolith illusion', ['A single will.', 'One soul.'], 29) +
  text(578, 380, '→', 2, 54, navy) +
  card(640, 165, 500, 480, 'Superintelligence as an ecosystem', [
    'Hypothesis generation and criticism.', 'Memory, reasoning, and sensing.', 'Heat and power metabolism.', 'Ceaseless exchange with the environment.'
  ], 27));

save(7, 'Necrosis and Metabolism', 1200, 650,
  card(60, 165, 1080, 180, 'Necrosis', ['Record → sealed → preserved without loss → no new knowledge.'], 63) +
  card(60, 375, 1080, 210, 'Metabolism', ['Record → read → transformed, misread, criticized, recombined → new knowledge → record …'], 62));

save(8, 'Two Roads of Inheritance', 1200, 780,
  card(60, 165, 1080, 250, 'The road of the genes', [
    "An individual's genome is halved every generation.", 'After a thousand years, one bloodline carries one ten-billionth on average.'
  ], 64) +
  card(60, 440, 1080, 265, 'The road outside the genes', [
    "An individual's methods and questions are copied, improved, and taught.", 'After a thousand years, they still work in countless hands and machines.'
  ], 64));

save(9, 'The Individual and the Collective Descendant', 1200, 710,
  card(60, 165, 1080, 205, "The isolated individual's view", [
    'Life → death and departure → nothing, complete oblivion.', 'Future society appears to be an unrelated outside.'
  ], 62) +
  card(60, 400, 1080, 240, 'Society as a collective descendant', [
    'Labor, methods, and norms settle into its structure.', 'They become conditions for future society to exist: a real inheritance without a name.'
  ], 62));

save(10, 'Starting Point and Destination', 1200, 670,
  card(60, 165, 1080, 190, 'What the parent hands over', [
    "First words, books to read, and good values set the child's initial position."
  ], 62) +
  card(60, 385, 1080, 215, 'What belongs to the child', [
    "Growing beyond the parent's understanding, the child follows an unreadable map toward its own destination."
  ], 62));

save(11, 'The Bacterium and the History of Life', 1200, 670,
  card(60, 165, 1080, 190, 'The independent bacterium', [
    'Endosymbiosis means giving up autonomy and most of its genes.'
  ], 62) +
  card(60, 385, 1080, 215, "The view of life's history", [
    'The bacterium enters a cell; the eukaryotic cell is born.', 'Its line later gives rise to multicellularity, brains, and societies.'
  ], 62));

let rings = '';
const ringData = [
  [390, 'Intelligence'], [305, 'Life'], [220, 'Humanity'], [135, 'Human'],
];
ringData.forEach(([r, label], i) => {
  rings += `<circle cx="600" cy="540" r="${r}" fill="none" stroke="${i === 0 ? navy : ink}" stroke-width="3"/>`;
  rings += text(600 - label.length * 10, 540 - r + 48, label, 30, 27, i === 0 ? navy : ink, 700);
});
save(12, 'Whose Descendant?', 1200, 1450, rings +
  text(80, 1010, 'Human = one human life', 65, 30) +
  text(80, 1070, 'Humanity = a single living species', 65, 30) +
  text(80, 1130, 'Life = a lineage of four billion years', 65, 30) +
  text(80, 1190, 'Intelligence = larger intelligences, appearing one after another', 65, 30) +
  text(80, 1290, 'From an inner ring, the outer ring looks like a delusion. From the outer ring, the inner ring is a transitional point.', 66, 29, navy, 700));

console.log('Generated 12 English SVG figures.');
