//this is to create the map:
export function createTetrisMap(width: number = 10, height: number = 20): number[][] {
    return Array.from({ length: height }, () => Array(width).fill(0));
}

export type TetrisLetter = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
// orientation of the shapes, so: 0 = up, 1 = right, 2 = down, 3 = left
export type Orientation = 0 | 1 | 2 | 3; 

const TetrisShapes: Record<TetrisLetter, number[][]> = {
    I: [
        [1, 1, 1, 1]
    ],
    O: [
        [1, 1],
        [1, 1]
    ],
    T: [
        [0, 1, 0],
        [1, 1, 1]
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0]
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1]
    ],
    J: [
        [1, 0, 0],
        [1, 1, 1]
    ],
    L: [
        [0, 0, 1],
        [1, 1, 1]
    ]
};

// this rotates the shape to the right
export function rotateRight(matrix: number[][]): number[][] {
    return matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());
}

// this rotates the shape to the left
export function rotateLeft(matrix: number[][]): number[][] {
    return matrix[0].map((_, i) => matrix.map(row => row[row.length - 1 - i]));
}

// This creates a shape based on letter and orientation
export function createShape(type: TetrisLetter, orientation: Orientation = 0): number[][] {
    let shape = TetrisShapes[type].map(row => [...row]);
    for (let i = 0; i < orientation; i++) {
        shape = rotateRight(shape);
    }
    return shape;
}

// This returns a random Tetris letter
export function randomLetter(): TetrisLetter {
    const letters: TetrisLetter[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    return letters[Math.floor(Math.random() * letters.length)];
}

// And this returns a random orientation
export function randomOrientation(): Orientation {
    return Math.floor(Math.random() * 4) as Orientation;
}