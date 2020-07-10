const list = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const text = Array.from(Buffer.from('Toller langer satz der lang is lol'));

let stuff = '';

const { length } = text;

for (let i = 0; i < length; i += 3) {
  const spliced = text.splice(0, 3);
  const binary = spliced.map((item) => '0'.repeat(8 - item.toString(2).length) + item.toString(2)).join('');

  for (let o = 0; o < binary.length; o += 6) {
    let char1 = binary.split('').splice(o, 6).join('');

    char1 += '0'.repeat(6 - char1.length);

    const number = parseInt(char1, 2);

    stuff += list[number];
  }
}

let newStuff = '';

Array.from(Buffer.from(stuff)).forEach((number) => {
  newStuff += '0'.repeat(3 - number.toString().length) + number;
});

console.log(newStuff);
