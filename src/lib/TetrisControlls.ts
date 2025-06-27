export type TetrisControlActions = {
    moveLeft: () => void;
    moveRight: () => void;
    hardDrop: () => void;
    rotateRight: () => void;
    rotateLeft: () => void;
    hold: () => void;
    softDrop: () => void;
};

export function setupTetrisControls(actions: TetrisControlActions) {
    function handleKeyDown(e: KeyboardEvent) {
        switch (e.code) {
            case 'ArrowLeft':
                actions.moveLeft();
                e.preventDefault();
                break;
            case 'ArrowRight':
                actions.moveRight();
                e.preventDefault();
                break;
            case 'Space':
                actions.hardDrop();
                e.preventDefault();
                break;
            case 'ArrowUp':
                actions.rotateRight();
                e.preventDefault();
                break;
            case 'ArrowDown':
                actions.softDrop();
                e.preventDefault();
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
            case 'KeyQ':
                actions.hold();
                e.preventDefault();
                break;
        }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
}