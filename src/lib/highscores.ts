const HIGHSCORE_KEY = 'tetris_highscores';

export type HighscoreEntry = {
    name: string;
    score: number;
};

export function getHighscores(): HighscoreEntry[] {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(HIGHSCORE_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw) as HighscoreEntry[];
    } catch {
        return [];
    }
}

export function saveHighscore(entry: HighscoreEntry) {
    const scores = getHighscores();
    scores.push(entry);
    scores.sort((a, b) => b.score - a.score);
    const top10 = scores.slice(0, 10);
    localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(top10));
}

export function clearHighscores() {
    localStorage.removeItem(HIGHSCORE_KEY);
}