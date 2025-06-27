<script lang="ts">
    import { createTetrisMap, createShape, randomLetter, randomOrientation } from '$lib/Tetris';
    import { setupTetrisControls } from '$lib/TetrisControlls'
    import { onDestroy, onMount } from 'svelte';
    import { getHighscores, saveHighscore, type HighscoreEntry } from '$lib/highscores';

    const mapWidth = 10;
    const mapHeight = 20;
    let map = createTetrisMap(mapWidth, mapHeight);

    let ShapeExists = false;
    let currentShape: number[][] = [];
    let shapeRow = 0;
    let shapeCol = 0;
    
    let level = 1;
    let linesCleared = 0;


    let nextLetter = randomLetter();
    let nextOrientation = randomOrientation();

    let orientation: any;
    let letter: any;
    let interval: number | null = null;
    let firstRound = true;

    // Calculate the ghost piece row (where the current shape would land if dropped)
    $: ghostRow = (() => {
        if (!ShapeExists) return 0;
        let row = shapeRow;
        while (canMoveTo(row + 1, shapeCol)) {
            row += 1;
        }
        return row;
    })();

    $: displayMap = (() => {
        shapeRow; 
        shapeCol; 
        currentShape;
        ghostRow;
        // Draw ghost first, then active, then fixed
        return map.map((row, rIdx) =>
            row.map((cell, cIdx) => {
                // Ghost
                if (
                    ShapeExists &&
                    rIdx >= ghostRow &&
                    rIdx < ghostRow + currentShape.length &&
                    cIdx >= shapeCol &&
                    cIdx < shapeCol + currentShape[0].length &&
                    currentShape[rIdx - ghostRow][cIdx - shapeCol]
                ) {
                    // Only show ghost if not overlapping with active
                    if (!(rIdx >= shapeRow && rIdx < shapeRow + currentShape.length &&
                        cIdx >= shapeCol && cIdx < shapeCol + currentShape[0].length &&
                        currentShape[rIdx - shapeRow][cIdx - shapeCol])) {
                        return 3; // ghost
                    }
                }
                // Active
                if (isShapeCell(rIdx, cIdx)) return 2;
                // Fixed
                return cell;
            })
        );
    })();

    $: nextShapeMatrix = createShape(nextLetter, nextOrientation);

    //this function spawns a new shape
    function spawnShape() {
        if (firstRound) {
            firstRound = false;
            letter = randomLetter();
            orientation; randomOrientation();
        }
        else {
            letter = nextLetter;
            orientation = nextOrientation;
            nextLetter = randomLetter();
            nextOrientation = randomOrientation();

        }
        // Use next shape for current
        currentShape = createShape(letter, orientation);

        shapeRow = -1;
        shapeCol = Math.floor((mapWidth - currentShape[0].length) / 2);

        ShapeExists = true;
        startMoveDown();
    }
    // Moves the shape downwards, should change the speed with score when added
    function startMoveDown() {
        clearMoveDown();
        // Classic Tetris: speed up as level increases (minimum 50ms)
        const speed = Math.max(500 - (level - 1) * 40, 50);
        interval = setInterval(() => {
            if (!ShapeExists) return;
            if (canMoveTo(shapeRow + 1, shapeCol)) {
                shapeRow += 1;
            } else {
                stickShape();
                clearMoveDown();
            }
        }, speed);
    }

    //this function stops the shape from moving downwards
    function clearMoveDown() {
        if (interval !== null) {
            clearInterval(interval);
            interval = null;
        }
    }

    //this is here to make sure the program knows if a shape is existing or not
    $: if (!ShapeExists && !gameOver) {
        spawnShape();
    }

    //this function checks if a cell/box is a shape or not
    function isShapeCell(rowIdx: number, colIdx: number): boolean {
        if (!ShapeExists) return false;
        for (let r = 0; r < currentShape.length; r++) {
            for (let c = 0; c < currentShape[0].length; c++) {
                if (
                    currentShape[r][c] &&
                    rowIdx === shapeRow + r &&
                    colIdx === shapeCol + c
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    //this is the controll section where i can move it or such
    let cleanupControls: (() => void) | null = null;

    function moveLeft() {
        if (ShapeExists && canMoveTo(shapeRow, shapeCol - 1)) {
            shapeCol -= 1;
        }
    }
    function moveRight() {
        if (ShapeExists && canMoveTo(shapeRow, shapeCol + 1)) {
            shapeCol += 1;
        }
    }
    function hardDrop() {
        if (!ShapeExists) return;
        while (canMoveTo(shapeRow + 1, shapeCol)) {
            shapeRow += 1;
        }
        stickShape();
        clearMoveDown();
    }
    function softDrop() {
        if (ShapeExists && canMoveTo(shapeRow + 1, shapeCol)) {
            shapeRow += 1;
            score += 1; // Optional: reward soft drop
        }
    }

    // Try to rotate with wall kicks (shift left/right if blocked)
    function tryRotateWithKick(rotated: number[][]): boolean {
        // Try original position
        if (canMoveTo(shapeRow, shapeCol, rotated)) {
            currentShape = rotated;
            return true;
        }
        // Try shifting left or right up to 2 spaces (standard SRS wall kick)
        for (let offset of [-1, 1, -2, 2]) {
            if (canMoveTo(shapeRow, shapeCol + offset, rotated)) {
                shapeCol += offset;
                currentShape = rotated;
                return true;
            }
        }
        // Optionally, try shifting up (for I piece, but simple version skips this)0
        return false;
    }

    function rotateShapeRight() {
        if (!ShapeExists) return;
        const rotated = rotateRight(currentShape);
        tryRotateWithKick(rotated);
    }
    function rotateShapeLeft() {
        if (!ShapeExists) return;
        const rotated = rotateLeft(currentShape);
        tryRotateWithKick(rotated);
    }

    // Checks if a shape can move to the cell/square
    function canMoveTo(newRow: number, newCol: number, shape = currentShape): boolean {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[0].length; c++) {
                if (shape[r][c]) {
                    const mapR = newRow + r;
                    const mapC = newCol + c;
                    if (
                        mapR < 0 ||
                        mapR >= mapHeight ||
                        mapC < 0 ||
                        mapC >= mapWidth ||
                        map[mapR][mapC] !== 0
                    ) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    import { rotateRight, rotateLeft } from '$lib/Tetris';

    onMount(() => {
        cleanupControls = setupTetrisControls({
            moveLeft,
            moveRight,
            hardDrop,
            rotateRight: rotateShapeRight,
            rotateLeft: rotateShapeLeft,
            hold: holdCurrentShape,
            softDrop
        });
    });

    onDestroy(() => {
        clearMoveDown();
        if (cleanupControls) cleanupControls();
    });

    let gameOver = false;

    //this function sticks the shape to the bottom or to the shape below
    function stickShape() {
        let outOfBounds = false;
        for (let r = 0; r < currentShape.length; r++) {
            for (let c = 0; c < currentShape[0].length; c++) {
                if (currentShape[r][c]) {
                    const mapR = shapeRow + r;
                    const mapC = shapeCol + c;
                    // If any part is above the map or outside horizontally, it's game over
                    if (mapR < 0 || mapR >= mapHeight || mapC < 0 || mapC >= mapWidth) {
                        outOfBounds = true;
                    } else {
                        map[mapR][mapC] = 1;
                    }
                }
            }
        }
        clearFullRows();
        ShapeExists = false;
        holdUsed = false; 
        // Game over if any part is out of bounds or if the top row is filled
        if (outOfBounds || map[0].some(cell => cell === 1)) {
            gameOver = true;
            clearMoveDown();
        }
    }

    let score = 0;

    import { tick } from 'svelte';

    let blinkingRows: number[] = [];

    // This function should clear a row if filled, with blinking animation
    async function clearFullRows() {
        let rowsToClear: number[] = [];
        for (let r = 0; r < map.length; r++) {
            if (map[r].every(cell => cell === 1)) {
                rowsToClear.push(r);
            }
        }
        if (rowsToClear.length > 0) {
            blinkingRows = rowsToClear;
            await tick();
            await new Promise(res => setTimeout(res, 350));
            let newMap = [];
            for (let r = 0; r < map.length; r++) {
                if (!rowsToClear.includes(r)) {
                    newMap.push([...map[r]]);
                }
            }
            while (newMap.length < mapHeight) {
                newMap.unshift(Array(mapWidth).fill(0));
            }
            map = newMap;
            blinkingRows = [];

            // Tetris scoring system
            const scoreTable = [0, 100, 300, 500, 800];
            score += (scoreTable[rowsToClear.length] || (rowsToClear.length * 200)) * (level + 1);

            // Track lines and level up every 10 lines
            linesCleared += rowsToClear.length;
            level = Math.floor(linesCleared / 10) + 1;
        }
    }

    let holdShape: number[][] | null = null;
    let holdLetter: string | null = null;
    let holdOrientation: any = null;
    let holdUsed = false;

    function holdCurrentShape() {
        if (holdUsed || !ShapeExists) return;
        holdUsed = true;

        // If nothing is held, store current and spawn next
        if (!holdShape) {
            holdShape = currentShape.map(row => [...row]);
            holdLetter = letter;
            holdOrientation = orientation;
            ShapeExists = false; // triggers spawnShape (which uses next shape)
        } else {
            // Swap current with hold
            const tempShape = holdShape;
            const tempLetter = holdLetter;
            const tempOrientation = holdOrientation;

            holdShape = currentShape.map(row => [...row]);
            holdLetter = letter;
            holdOrientation = orientation;

            letter = tempLetter;
            orientation = tempOrientation;
            currentShape = tempShape.map(row => [...row]);
            shapeRow = -1;
            shapeCol = Math.floor((mapWidth - currentShape[0].length) / 2);
        }
    }

    $: if (holdShape) {
        // Update the held shape's position to be centered
        const offset = Math.floor((mapWidth - holdShape[0].length) / 2);
        for (let r = 0; r < holdShape.length; r++) {
            for (let c = 0; c < holdShape[0].length; c++) {
                if (holdShape[r][c]) {
                    holdShape[r][c] = 1;
                }
            }
        }
    }

    function resetGame() {
        map = createTetrisMap(mapWidth, mapHeight);
        score = 0;
        ShapeExists = false;
        currentShape = [];
        shapeRow = 0;
        shapeCol = 0;
        nextLetter = randomLetter();
        nextOrientation = randomOrientation();
        orientation = undefined;
        letter = undefined;
        holdShape = null;
        holdLetter = null;
        holdOrientation = null;
        holdUsed = false;
        firstRound = true;
        gameOver = false;
        level = 1;
        linesCleared = 0;
    }

    let highscores: HighscoreEntry[] = [];
    let playerName = '';
    let canSaveScore = false;

    $: highscores = getHighscores();

    $: if (gameOver) {
        canSaveScore = true;
        playerName = '';
    }

    function handleSaveScore() {
        if (!canSaveScore || !playerName.trim()) return;
        saveHighscore({ name: playerName.trim().slice(0, 12), score });
        highscores = getHighscores();
        canSaveScore = false;
    }
</script>

{#if gameOver}
    <div class="game-over-overlay">
        <div class="game-over-box">
            <div class="game-over-title">Game Over</div>
            <div class="final-score">Score: {score}</div>
            <input
                type="text"
                placeholder="Your name"
                bind:value={playerName}
                maxlength="12"
                class="name-input"
                disabled={!canSaveScore}
            />
            <button class="save-score-btn" on:click={handleSaveScore} disabled={!canSaveScore || !playerName.trim()}>
                Save Score
            </button>
            <button class="try-again-btn" on:click={resetGame}>Try Again</button>
        </div>
    </div>
{/if}

<div class="centered" style:filter={gameOver ? 'blur(3px)' : ''}>
    <div class="tetris-container">
        
        <div class="hold-shape-box">
        <div class="hold-label">Hold</div>
        <table class="hold-shape-table">
            <tbody>
                {#if holdShape}
                    {#each holdShape as row}
                        <tr>
                            {#each row as cell}
                                <td class="hold-cell {cell ? 'active' : ''}"></td>
                            {/each}
                        </tr>
                    {/each}
                {:else}
                    {#each Array(4) as _, i}
                        <tr>
                            {#each Array(4) as _, j}
                                <td class="hold-cell"></td>
                            {/each}
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
        <button on:click={holdCurrentShape} disabled={holdUsed || !ShapeExists}>Hold (Q/Shift)</button>
    </div>
        <table class="background">
            <tbody>
                {#each displayMap as row, rIdx}
                    <tr>
                        {#each row as cell, cIdx}
                            <td class="box
                                {cell === 2 ? ' active' : ''}
                                {cell === 1 ? ' fixed' : ''}
                                {cell === 3 ? ' ghost' : ''}
                                {blinkingRows.includes(rIdx) && cell === 1 ? ' blinking' : ''}">
                            </td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
        <div>
            <div class="next-shape-box">
                <div class="next-label">Next</div>
                <table class="next-shape-table">
                    <tbody>
                        {#each nextShapeMatrix as row}
                            <tr>
                                {#each row as cell}
                                    <td class="next-cell {cell ? 'active' : ''}"></td>
                                {/each}
                            </tr>
                        {/each}
                    </tbody>
                </table>
                <div class="score-label">Score</div>
                <div class="score-value">{score}</div>
                <div class="score-label">Level</div>
                <div class="score-value">{level}</div>
            </div>
            <div class="highscore-box">
                <div class="highscore-title">Highscores</div>
                <ol class="highscore-list">
                    {#each highscores as entry, i}
                        <li>
                            <span class="hs-rank">{i + 1}.</span>
                            <span class="hs-name">{entry.name}</span>
                            <span class="hs-score">{entry.score}</span>
                        </li>
                    {/each}
                    {#if highscores.length === 0}
                        <li class="no-scores">No scores yet</li>
                    {/if}
                </ol>
            </div>
        </div>
    </div>
</div>

<style>
    .background {
        background: black;
    }

    .box {
        width: 39px;
        height: 39px;
        border: 1px solid #ccc;
        background: gray;
        transition: background 0.1s;
    }

    .box.active {
        background: #00eaff;
    }

    .box.fixed {
        background: white;
    }

    .box.ghost {
        background: #00eaff44;
        border: 1px dashed #00eaff;
    }

    .centered {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
    }

    .tetris-container {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        gap: 32px;
        position: relative;
    }

    .next-shape-box {
        background: #222;
        border-radius: 8px;
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 90px;
        min-height: 90px;
        box-shadow: 0 2px 8px #0004;
    }

    .next-label {
        color: #fff;
        font-size: 1.1em;
        margin-bottom: 6px;
        letter-spacing: 1px;
    }

    .next-shape-table {
        border-collapse: collapse;
    }

    .next-cell {
        width: 18px;
        height: 18px;
        border: 1px solid #555;
        background: #444;
    }

    .next-cell.active {
        background: #00eaff;
    }

    .hold-shape-box {
        background: #222;
        border-radius: 8px;
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 90px;
        min-height: 90px;
        box-shadow: 0 2px 8px #0004;
        margin-right: 32px;
    }

    .hold-label {
        color: #fff;
        font-size: 1.1em;
        margin-bottom: 6px;
        letter-spacing: 1px;
    }

    .hold-shape-table {
        border-collapse: collapse;
        margin-bottom: 8px;
    }

    .hold-cell {
        width: 18px;
        height: 18px;
        border: 1px solid #555;
        background: #444;
    }

    .hold-cell.active {
        background: #ffb300;
    }

    .score-label {
        color: #fff;
        font-size: 1.1em;
        margin-top: 12px;
        letter-spacing: 1px;
        text-align: center;
    }
    .score-value {
        color: #ffb300;
        font-size: 1.5em;
        font-weight: bold;
        margin-top: 2px;
        text-align: center;
    }

    .game-over-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
    }
    .game-over-box {
        background: #222;
        color: #fff;
        padding: 32px 48px;
        border-radius: 16px;
        box-shadow: 0 4px 24px #000a;
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .game-over-title {
        font-size: 2.2em;
        font-weight: bold;
        margin-bottom: 16px;
        color: #ff5252;
        letter-spacing: 2px;
    }
    .final-score {
        font-size: 1.3em;
        margin-bottom: 24px;
        color: #ffb300;
    }
    .try-again-btn {
        font-size: 1.1em;
        padding: 10px 28px;
        border: none;
        border-radius: 8px;
        background: #00eaff;
        color: #222;
        font-weight: bold;
        cursor: pointer;
        transition: background 0.2s;
    }
    .try-again-btn:hover {
        background: #00b8c6;
    }
    .highscore-box {
        background: #222;
        border-radius: 8px;
        padding: 12px 16px;
        min-width: 160px;
        min-height: 250px;
        box-shadow: 0 2px 8px #0004;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        position: absolute;
        right: 1000;
        bottom: 0;
    }
    .highscore-title {
        color: #fff;
        font-size: 1.1em;
        margin-bottom: 6px;
        letter-spacing: 1px;
        font-weight: bold;
    }
    .highscore-list {
        list-style: none;
        padding: 0;
        margin: 0;
        width: 100%;
    }
    .highscore-list li {
        display: flex;
        justify-content: space-between;
        color: #fff;
        font-size: 1em;
        margin-bottom: 2px;
        padding: 2px 0;
    }
    .hs-rank {
        width: 2em;
        color: #ffb300;
        font-weight: bold;
    }
    .hs-name {
        flex: 1;
        margin-left: 4px;
        margin-right: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .hs-score {
        min-width: 2.5em;
        text-align: right;
        color: #00eaff;
        font-weight: bold;
    }
    .no-scores {
        color: #888;
        font-style: italic;
        text-align: center;
        width: 100%;
    }
    .name-input {
        margin-bottom: 8px;
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid #444;
        font-size: 1em;
        width: 160px;
        box-sizing: border-box;
        outline: none;
    }
    .save-score-btn {
        font-size: 1.1em;
        padding: 8px 18px;
        border: none;
        border-radius: 8px;
        background: #ffb300;
        color: #222;
        font-weight: bold;
        cursor: pointer;
        margin-bottom: 10px;
        margin-right: 8px;
        transition: background 0.2s;
    }
    .save-score-btn:disabled {
        background: #888;
        color: #222;
        cursor: not-allowed;
    }

    .blinking {
        animation: blink-row 0.35s linear 3;
    }
    @keyframes blink-row {
        0%, 100% { background: white; }
        50% { background: #ff5252; }
    }
</style>
