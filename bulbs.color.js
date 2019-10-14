exports.colors = {
    toHex: (color) => {
        let r = g = b = 0;
        if (color == 'red' || color == 'r') {
            r = 255
        } else if (color == 'blue' || color == 'b') {
            b = 255
        } else if (color == 'green' || color == 'g') {
            g = 255
        } else if (color == 'random') {
            r = getRandomInt(255)
            g = getRandomInt(255)
            b = getRandomInt(255)
        }

        return {r:r, g:g, b:b};
    },
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

