const { useState, useEffect, useCallback, useRef } = React;

// 파이어베이스 설정 (현재 CDN 환경에 맞춘 호환 버전 사용)
const firebaseConfig = {
  apiKey: "AIzaSyDMyX9BByWxe-GP2VTKGKhXV3fIrelgrEg",
  authDomain: "maze-rank-base.firebaseapp.com",
  projectId: "maze-rank-base",
  storageBucket: "maze-rank-base.firebasestorage.app",
  messagingSenderId: "1093306656129",
  appId: "1:1093306656129:web:56b87ae9cd5cef5e24f480",
  measurementId: "G-VT1Z0PSFR6"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

const getRankings = async () => {
    try {
        const snapshot = await db.collection('rankings')
            .orderBy('time', 'asc')
            .limit(10)
            .get();
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error("랭킹 불러오기 실패:", error);
        return [];
    }
};

const saveRanking = async (nickname, time) => {
    try {
        await db.collection('rankings').add({
            nickname,
            time,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("랭킹 저장 실패:", error);
    }
};

const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(2, '0')}`;
};

const getGridSize = (stage) => {
    const sizes = [15, 15, 17, 17, 19, 21, 21, 23, 25, 25];
    return sizes[stage - 1] || 25;
};

const CHARACTERS = [
    { id: 'char0', type: 'image', src: 'image_0.png', name: '치즈 고양이' },
    { id: 'char2', type: 'image', src: 'image_2.png', name: '캐릭터 2' },
    { id: 'char3', type: 'image', src: 'image_3.png', name: '캐릭터 3' },
    { id: 'char4', type: 'image', src: 'image_4.png', name: '캐릭터 4' },
    { id: 'char14', type: 'image', src: 'image_14.png', name: '캐릭터 5' },
    { id: 'char15', type: 'image', src: 'image_15.png', name: '캐릭터 6' },
    { id: 'char16', type: 'image', src: 'image_16.png', name: '캐릭터 7' },
    { id: 'char17', type: 'image', src: 'image_17.png', name: '캐릭터 8' }
];

const SNACKS = [
    { id: 'snack5', type: 'image', src: 'image_5.png', name: '채소 1' },
    { id: 'snack6', type: 'image', src: 'image_6.png', name: '채소 2' },
    { id: 'snack7', type: 'image', src: 'image_7.png', name: '채소 3' },
    { id: 'snack8', type: 'image', src: 'image_8.png', name: '채소 4' },
    { id: 'snack9', type: 'image', src: 'image_9.png', name: '채소 5' },
    { id: 'snack10', type: 'image', src: 'image_10.png', name: '채소 6' },
    { id: 'snack11', type: 'image', src: 'image_11.png', name: '채소 7' },
    { id: 'snack12', type: 'image', src: 'image_12.png', name: '채소 8' }
];

function generateMaze(size, stage) {
    const finalSize = size % 2 === 0 ? size + 1 : size;
    const maze = Array(finalSize).fill().map(() => Array(finalSize).fill(1));
    const dx = [0, 0, 2, -2];
    const dy = [2, -2, 0, 0];
    
    function isValid(x, y) {
        return x > 0 && x < finalSize - 1 && y > 0 && y < finalSize - 1;
    }
    
    function dfs(x, y) {
        maze[y][x] = 0;
        const dirs = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
        for (let i of dirs) {
            const nx = x + dx[i];
            const ny = y + dy[i];
            if (isValid(nx, ny) && maze[ny][nx] === 1) {
                maze[y + dy[i]/2][x + dx[i]/2] = 0;
                dfs(nx, ny);
            }
        }
    }
    dfs(1, 1);
    
    // Higher stage = fewer wall breaks = more dead ends and stricter path
    const breakRatio = Math.max(0, (10 - stage) / 9); 
    const attempts = Math.floor(finalSize * 3 * breakRatio);
    
    for(let i=0; i < attempts; i++) {
        const x = Math.floor(Math.random() * (finalSize - 2)) + 1;
        const y = Math.floor(Math.random() * (finalSize - 2)) + 1;
        if (maze[y][x] === 1) {
            let pathCount = 0;
            if (maze[y+1] && maze[y+1][x] === 0) pathCount++;
            if (maze[y-1] && maze[y-1][x] === 0) pathCount++;
            if (maze[y][x+1] === 0) pathCount++;
            if (maze[y][x-1] === 0) pathCount++;
            if (pathCount >= 2) {
                maze[y][x] = 0;
            }
        }
    }
    return maze;
}

function getRandomPathPosition(maze) {
    const paths = [];
    for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[y].length; x++) {
            if (maze[y][x] === 0) {
                paths.push({x, y});
            }
        }
    }
    return paths[Math.floor(Math.random() * paths.length)];
}

const Dropdown = ({ label, options, selectedId, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selected = options.find(o => o.id === selectedId);

    return (
        <div className="flex flex-col mb-6 w-full relative">
            <div className="flex justify-between items-end mb-2">
                <span className="text-[12px] font-bold text-[#3d2314] font-pixel">{label}</span>
                <span className="text-[10px] text-[#3d2314] font-pixel">▼</span>
            </div>
            <div 
                className="retro-select-container flex items-center justify-center"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="w-14 h-14 border-4 border-[#3d2314] bg-[#e3cba8] flex items-center justify-center">
                    {selected.type === 'image' ? (
                        <img src={selected.src} className="w-12 h-12 object-contain pixelated" alt="" />
                    ) : (
                        <span className="text-3xl font-pixel">{selected.value}</span>
                    )}
                </div>
            </div>
            {isOpen && (
                <div className="absolute top-full left-0 w-full bg-[#e3cba8] border-4 border-[#3d2314] mt-1 z-50 max-h-48 overflow-y-auto shadow-lg grid grid-cols-4 gap-2 p-2">
                    {options.map(opt => (
                        <div 
                            key={opt.id} 
                            className="flex justify-center items-center p-2 hover:bg-[#d4b48e] cursor-pointer border-2 border-transparent hover:border-[#3d2314]"
                            onClick={() => { onSelect(opt.id); setIsOpen(false); }}
                        >
                            <div className="w-10 h-10 border-2 border-[#3d2314] bg-[#e3cba8] flex items-center justify-center">
                                {opt.type === 'image' ? (
                                    <img src={opt.src} className="w-8 h-8 object-contain pixelated" alt="" />
                                ) : (
                                    <span className="text-2xl font-pixel">{opt.value}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const SettingsScreen = ({ onStart }) => {
    const [character, setCharacter] = useState(CHARACTERS[0].id);
    const [snack, setSnack] = useState(SNACKS[0].id);
    const [rankings, setRankings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getRankings().then(data => {
            setRankings(data);
            setIsLoading(false);
        });
    }, []);

    return (
        <div className="flex flex-col md:flex-row items-stretch justify-center w-full max-w-4xl mx-4 gap-8 font-pixel">
            {/* Left Panel: Setup */}
            <div className="flex flex-col items-center p-8 retro-panel w-full md:w-1/2">
                <h1 className="title-gold text-2xl md:text-3xl mb-8 mt-2 font-pixel">
                    ADVENTURE<br/>SETUP
                </h1>

                <Dropdown 
                    label="플레이어 캐릭터"
                    options={CHARACTERS}
                    selectedId={character}
                    onSelect={setCharacter}
                />

                <Dropdown 
                    label="목표 간식"
                    options={SNACKS}
                    selectedId={snack}
                    onSelect={setSnack}
                />

                <div className="flex flex-col w-full mt-8 space-y-4">
                    <button 
                        className="retro-btn py-4 text-sm w-full font-pixel"
                        onClick={() => onStart(character, snack)}
                    >
                        START MAZE
                    </button>
                </div>
            </div>

            {/* Right Panel: Leaderboard */}
            <div className="flex flex-col items-center p-8 retro-panel w-full md:w-1/2">
                <h1 className="title-gold text-xl md:text-2xl mb-2 font-pixel text-center">
                    Global Top 10
                </h1>
                <p className="text-[12px] text-[#3d2314] font-bold mb-4 font-pixel text-center">
                    (Time Attack)
                </p>

                <div className="w-full bg-[#d4b48e] border-4 border-[#3d2314] rounded-sm p-4 flex-1 mb-2 mt-4 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center text-[#3d2314] text-xs font-pixel animate-pulse">
                            랭킹 로딩 중...
                        </div>
                    ) : rankings.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-[#3d2314] text-xs font-pixel">
                            기록이 없습니다.
                        </div>
                    ) : (
                        <ul className="space-y-4">
                            {rankings.map((rank, idx) => (
                                <li key={idx} className="flex justify-between text-[#3d2314] text-[12px] border-b-2 border-[#a05b3d] pb-2 font-pixel">
                                    <div>
                                        <span className="mr-3 font-bold text-[#a05b3d]">
                                            #{idx + 1}
                                        </span>
                                        <span>{rank.nickname}</span>
                                    </div>
                                    <span className="font-bold">{formatTime(rank.time)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

const GameScreen = ({ characterId, snackId, onBack }) => {
    const charObj = CHARACTERS.find(c => c.id === characterId) || CHARACTERS[0];
    const snackObj = SNACKS.find(s => s.id === snackId) || SNACKS[0];

    const [stage, setStage] = useState(1);
    const MAX_STAGE = 10;

    const [maze, setMaze] = useState([]);
    const [pos, setPos] = useState({x: 0, y: 0});
    const [targetPos, setTargetPos] = useState({x: 0, y: 0});
    const [visited, setVisited] = useState([]);
    
    // Time Attack State
    const [isCleared, setIsCleared] = useState(false);
    const [isGameFinished, setIsGameFinished] = useState(false);
    const [accumulatedTime, setAccumulatedTime] = useState(0);
    const [stageStartTime, setStageStartTime] = useState(Date.now());
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [nickname, setNickname] = useState('');
    const [isGivingUp, setIsGivingUp] = useState(false);
    const [pauseTime, setPauseTime] = useState(null);
    
    const [moves, setMoves] = useState(0);
    const [activeKey, setActiveKey] = useState(null);
    
    const posRef = useRef(pos);
    const mazeRef = useRef(maze);
    const isClearedRef = useRef(isCleared);
    const targetPosRef = useRef(targetPos);
    const isGivingUpRef = useRef(isGivingUp);

    useEffect(() => {
        posRef.current = pos;
        mazeRef.current = maze;
        isClearedRef.current = isCleared;
        targetPosRef.current = targetPos;
        isGivingUpRef.current = isGivingUp;
    }, [pos, maze, isCleared, targetPos, isGivingUp]);

    const initGame = useCallback((currentStage = 1, currentAccumulated = 0) => {
        const size = getGridSize(currentStage);
        const newMaze = generateMaze(size, currentStage);
        setMaze(newMaze);
        
        if (currentStage === 1) {
            setMoves(0);
        }
        
        // 1st BFS to find a remote point A (which will be our start)
        const initialStart = getRandomPathPosition(newMaze);
        let dist = Array(newMaze.length).fill().map(() => Array(newMaze[0].length).fill(-1));
        let queue = [{...initialStart, d: 0}];
        dist[initialStart.y][initialStart.x] = 0;
        
        let pointA = initialStart;
        let maxD = 0;
        const dx = [0, 0, 1, -1];
        const dy = [1, -1, 0, 0];
        
        while (queue.length > 0) {
            const {x, y, d} = queue.shift();
            if (d > maxD) {
                maxD = d;
                pointA = {x, y};
            }
            for (let i=0; i<4; i++) {
                const nx = x + dx[i];
                const ny = y + dy[i];
                if (ny >= 0 && ny < newMaze.length && nx >= 0 && nx < newMaze[0].length) {
                    if (newMaze[ny][nx] === 0 && dist[ny][nx] === -1) {
                        dist[ny][nx] = d + 1;
                        queue.push({x: nx, y: ny, d: d + 1});
                    }
                }
            }
        }
        
        // 2nd BFS from point A to find the true max distances
        dist = Array(newMaze.length).fill().map(() => Array(newMaze[0].length).fill(-1));
        queue = [{...pointA, d: 0}];
        dist[pointA.y][pointA.x] = 0;
        
        maxD = 0;
        let furthestCandidates = [];
        
        while (queue.length > 0) {
            const {x, y, d} = queue.shift();
            if (d > maxD) {
                maxD = d;
                furthestCandidates = [{x, y}];
            } else if (d === maxD) {
                furthestCandidates.push({x, y});
            }
            for (let i=0; i<4; i++) {
                const nx = x + dx[i];
                const ny = y + dy[i];
                if (ny >= 0 && ny < newMaze.length && nx >= 0 && nx < newMaze[0].length) {
                    if (newMaze[ny][nx] === 0 && dist[ny][nx] === -1) {
                        dist[ny][nx] = d + 1;
                        queue.push({x: nx, y: ny, d: d + 1});
                    }
                }
            }
        }
        
        // Difficulty Scaling: Place target further away as stage increases
        let targetCandidates = [];
        let targetThresholdLow = 0;
        let targetThresholdHigh = 1;
        
        if (currentStage <= 3) {
            targetThresholdLow = 0.5;
            targetThresholdHigh = 0.7;
        } else if (currentStage <= 7) {
            targetThresholdLow = 0.75;
            targetThresholdHigh = 0.9;
        } else {
            targetThresholdLow = 0.95;
            targetThresholdHigh = 1.0;
        }
        
        for (let y = 0; y < newMaze.length; y++) {
            for (let x = 0; x < newMaze[0].length; x++) {
                const d = dist[y][x];
                if (d >= maxD * targetThresholdLow && d <= maxD * targetThresholdHigh) {
                    targetCandidates.push({x, y});
                }
            }
        }
        
        if (targetCandidates.length === 0) {
            targetCandidates = furthestCandidates; // Fallback
        }
        
        const target = targetCandidates[Math.floor(Math.random() * targetCandidates.length)];
        const start = pointA;

        setPos(start);
        setTargetPos(target);
        setVisited([`${start.x},${start.y}`]);
        setIsCleared(false);
        setPauseTime(null);
        if (currentStage === 1) {
            setIsGameFinished(false);
            setNickname('');
            setAccumulatedTime(0);
        } else {
            setAccumulatedTime(currentAccumulated);
        }
        setStage(currentStage);
        
        const now = Date.now();
        setStageStartTime(now);
        setCurrentTime(now);
    }, []);

    useEffect(() => {
        initGame(1, 0);
    }, [initGame]);

    useEffect(() => {
        let interval;
        if (!isCleared && !pauseTime) {
            interval = setInterval(() => {
                setCurrentTime(Date.now());
            }, 30);
        }
        return () => clearInterval(interval);
    }, [isCleared, pauseTime]);

    const handleMove = (direction) => {
        if (isClearedRef.current) return;
        if (!mazeRef.current.length) return;
        if (isGivingUpRef.current) return;

        let { x, y } = posRef.current;
        let moved = false;

        if (direction === 'up') { y -= 1; moved = true; }
        else if (direction === 'down') { y += 1; moved = true; }
        else if (direction === 'left') { x -= 1; moved = true; }
        else if (direction === 'right') { x += 1; moved = true; }

        if (moved) {
            const currentMaze = mazeRef.current;
            if (currentMaze[y] && currentMaze[y][x] === 0) {
                setPos({x, y});
                setMoves(m => m + 1);
                const posStr = `${x},${y}`;
                setVisited(prev => {
                    const existingIdx = prev.indexOf(posStr);
                    if (existingIdx !== -1) return prev.slice(0, existingIdx + 1);
                    return [...prev, posStr];
                });

                if (x === targetPosRef.current.x && y === targetPosRef.current.y) {
                    setIsCleared(true);
                    setAccumulatedTime(prev => {
                        const activeElapsed = pauseTime ? (pauseTime - stageStartTime) : (Date.now() - stageStartTime);
                        const newTotal = prev + activeElapsed;
                        if (stage === MAX_STAGE) setIsGameFinished(true);
                        return newTotal;
                    });
                    if (window.confetti) {
                        window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#f4a28c', '#eebb4d', '#e3cba8'] });
                    }
                }
            }
        }
    };

    const handleMoveRef = useRef(handleMove);
    useEffect(() => {
        handleMoveRef.current = handleMove;
    });

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isClearedRef.current) return;
            if (!mazeRef.current.length) return;

            let { x, y } = posRef.current;
            let moved = false;
            
            const key = e.key.toLowerCase();
            
            if (key === 'escape') {
                if (!isGivingUpRef.current) {
                    setIsGivingUp(true);
                    setPauseTime(Date.now());
                }
                return;
            }

            let direction = null;
            if (['arrowup', 'w', 'ㅈ'].includes(key)) direction = 'up';
            else if (['arrowdown', 's', 'ㄴ'].includes(key)) direction = 'down';
            else if (['arrowleft', 'a', 'ㅁ'].includes(key)) direction = 'left';
            else if (['arrowright', 'd', 'ㅇ'].includes(key)) direction = 'right';

            if (direction) {
                if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
                    e.preventDefault();
                }
                setActiveKey(direction);
                handleMoveRef.current(direction);
            }
        };

        const handleKeyUp = () => {
            setActiveKey(null);
        };

        window.addEventListener('keydown', handleKeyDown, { passive: false });
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [stageStartTime, stage, accumulatedTime, pauseTime]);



    if (!maze.length) return null;

    const activeElapsed = pauseTime ? (pauseTime - stageStartTime) : (currentTime - stageStartTime);
    const elapsedMs = isCleared ? accumulatedTime : accumulatedTime + activeElapsed;
    const diffText = stage < 4 ? '쉬움' : stage < 8 ? '보통' : '어려움';

    return (
        <div 
            className="flex flex-col items-center w-full px-2 font-pixel relative h-[100dvh] overflow-hidden py-2 md:py-4"
            style={{ touchAction: 'none', userSelect: 'none' }}
        >
            <div className="w-full max-w-6xl flex justify-between items-end mb-2 mx-auto shrink-0">
                <h1 className="title-gold text-xl md:text-2xl font-pixel flex-1 text-center">
                    ANIMAL'S MAZE ADVENTURE
                </h1>
            </div>
            
            <div className="retro-panel mb-2 md:mb-4 px-6 py-2 w-full max-w-6xl mx-auto bg-[#e3cba8] border-4 border-[#3d2314] text-center shrink-0">
                <div className="text-[12px] text-[#a05b3d] font-bold mb-1">TOTAL TIME</div>
                <div className="text-xl md:text-2xl text-[#3d2314] font-bold tracking-widest">{formatTime(elapsedMs)}</div>
            </div>

            <div className="flex flex-col md:flex-row w-full max-w-6xl mx-auto items-center md:items-stretch justify-center gap-2 md:gap-4 flex-1 min-h-0">
                
                {/* Center Maze */}
                <div className="flex-1 w-full h-full flex items-center justify-center min-h-0 order-1 md:order-2">
                    <div 
                        className="maze-grid aspect-square relative border-4 border-[#3d2314] bg-[#2a3f40]"
                        style={{ 
                            gridTemplateColumns: `repeat(${maze[0].length}, 1fr)`,
                            height: '100%',
                            maxHeight: 'min(100%, 75vw)',
                            maxWidth: '100%'
                        }}
                    >
                        {maze.map((row, y) => 
                            row.map((cell, x) => {
                            const isWall = cell === 1;
                            const isPlayer = pos.x === x && pos.y === y;
                            const isTarget = targetPos.x === x && targetPos.y === y;
                            const isVisited = visited.includes(`${x},${y}`) && !isPlayer && !isTarget && !isWall;

                            let cellClass = 'maze-cell ';
                            if (isWall) cellClass += 'cell-wall ';
                            else if (isVisited) cellClass += 'cell-visited ';
                            else cellClass += 'cell-path ';

                            return (
                                <div key={`${x}-${y}`} className={cellClass}>
                                    {isPlayer ? (
                                        charObj.type === 'image' ? (
                                            <img src={charObj.src} className="absolute inset-0 w-full h-full object-contain scale-[1.3] z-10 animate-bounce" style={{ imageRendering: 'pixelated' }} alt="player" />
                                        ) : (
                                            <span className="absolute inset-0 flex items-center justify-center z-10 text-[min(3vw,24px)] animate-bounce font-pixel">{charObj.value}</span>
                                        )
                                    ) : isTarget ? (
                                        snackObj.type === 'image' ? (
                                            <img src={snackObj.src} className="absolute inset-0 w-full h-full object-contain scale-[1.3] z-10 animate-pulse" style={{ imageRendering: 'pixelated' }} alt="snack" />
                                        ) : (
                                            <span className="absolute inset-0 flex items-center justify-center z-10 text-[min(3vw,24px)] animate-pulse font-pixel">{snackObj.value}</span>
                                        )
                                    ) : ''}
                                </div>
                            );
                        })
                    )}
                    </div>
                </div>

                {/* Bottom Controls Wrapper (Mobile) / Side Panels (Desktop) */}
                <div className="flex flex-row md:contents w-full gap-2 order-2 md:order-none shrink-0 h-32 md:h-auto">
                    
                    {/* Left Panel: D-Pad */}
                    <div className="flex flex-col items-center retro-panel p-2 md:p-4 bg-[#e3cba8] flex-1 md:flex-none md:w-48 shrink-0 justify-center md:h-full max-h-[600px] md:my-auto md:order-1">
                        <div className="hidden md:block text-[14px] text-[#3d2314] font-bold text-center mb-6 leading-tight font-pixel">
                            Move with<br/><span className="text-[16px] mt-2 inline-block font-pixel text-[#a05b3d]">ARROW KEYS</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 scale-[0.85] sm:scale-100 md:scale-125">
                            <button 
                                onPointerDown={(e) => { e.preventDefault(); handleMoveRef.current('up'); setActiveKey('up'); }}
                                onPointerUp={() => setActiveKey(null)}
                                onPointerLeave={() => setActiveKey(null)}
                                className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-[#a05b3d] text-white rounded-t-lg border-2 border-[#3d2314] shadow-[0_4px_0_#3d2314] ${activeKey === 'up' ? 'translate-y-1 shadow-none bg-[#8a4b30]' : 'active:shadow-none active:translate-y-1'}`}
                            >↑</button>
                            <div className="flex gap-1">
                                <button 
                                    onPointerDown={(e) => { e.preventDefault(); handleMoveRef.current('left'); setActiveKey('left'); }}
                                    onPointerUp={() => setActiveKey(null)}
                                    onPointerLeave={() => setActiveKey(null)}
                                    className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-[#a05b3d] text-white rounded-l-lg border-2 border-[#3d2314] shadow-[0_4px_0_#3d2314] ${activeKey === 'left' ? 'translate-y-1 shadow-none bg-[#8a4b30]' : 'active:shadow-none active:translate-y-1'}`}
                                >←</button>
                                <button 
                                    onPointerDown={(e) => { e.preventDefault(); handleMoveRef.current('down'); setActiveKey('down'); }}
                                    onPointerUp={() => setActiveKey(null)}
                                    onPointerLeave={() => setActiveKey(null)}
                                    className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-[#a05b3d] text-white border-2 border-[#3d2314] rounded-b-lg shadow-[0_4px_0_#3d2314] ${activeKey === 'down' ? 'translate-y-1 shadow-none bg-[#8a4b30]' : 'active:shadow-none active:translate-y-1'}`}
                                >↓</button>
                                <button 
                                    onPointerDown={(e) => { e.preventDefault(); handleMoveRef.current('right'); setActiveKey('right'); }}
                                    onPointerUp={() => setActiveKey(null)}
                                    onPointerLeave={() => setActiveKey(null)}
                                    className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-[#a05b3d] text-white rounded-r-lg border-2 border-[#3d2314] shadow-[0_4px_0_#3d2314] ${activeKey === 'right' ? 'translate-y-1 shadow-none bg-[#8a4b30]' : 'active:shadow-none active:translate-y-1'}`}
                                >→</button>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Stats & Quit */}
                    <div className="flex flex-col justify-between items-center retro-panel p-2 md:p-4 bg-[#e3cba8] flex-1 md:flex-none md:w-48 shrink-0 md:h-full max-h-[600px] md:my-auto md:order-3">
                        <div className="flex flex-col text-[12px] md:text-[14px] text-[#3d2314] font-bold space-y-2 md:space-y-4 text-center font-pixel mt-2 md:mt-0">
                            <div>
                                <div className="font-pixel text-[#a05b3d] mb-1">Level</div>
                                <div className="text-xl md:text-2xl">{stage} <span className="text-[10px] md:text-[12px] block mt-1">({diffText})</span></div>
                            </div>
                            <div>
                                <div className="font-pixel text-[#a05b3d] mb-1 md:mt-4">Moves</div>
                                <div className="text-xl md:text-2xl">{moves}</div>
                            </div>
                        </div>
                        <button 
                            onPointerDown={(e) => {
                                e.preventDefault();
                                if (!isGivingUpRef.current) {
                                    setIsGivingUp(true);
                                    setPauseTime(Date.now());
                                }
                            }}
                            className="retro-btn py-2 md:py-3 px-2 md:px-4 text-[10px] md:text-[12px] bg-[#a05b3d] text-white font-pixel w-full mt-auto"
                        >
                            QUIT
                        </button>
                    </div>
                </div>
            </div>

            {isCleared && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 modal-overlay px-4">
                    <div className="retro-panel p-8 flex flex-col items-center max-w-md w-full text-center">
                        <h2 className="title-gold text-2xl mb-6 font-pixel">
                            {isGameFinished ? '모두 클리어!' : `스테이지 ${stage} 클리어!`}
                        </h2>
                        
                        <div className="flex items-center justify-center space-x-4 mb-6">
                            {charObj.type === 'image' ? (
                                <img src={charObj.src} className="animate-bounce w-16 h-16 object-contain" style={{ imageRendering: 'pixelated' }} alt="player" />
                            ) : (
                                <span className="animate-bounce text-4xl font-pixel">{charObj.value}</span>
                            )}
                            <img src="image_13.png" className="w-10 h-10 object-contain mx-2" style={{ imageRendering: 'pixelated' }} alt="heart" />
                            {snackObj.type === 'image' ? (
                                <img src={snackObj.src} className="animate-bounce w-16 h-16 object-contain" style={{ animationDelay: '0.2s', imageRendering: 'pixelated' }} alt="snack" />
                            ) : (
                                <span className="animate-bounce text-4xl font-pixel" style={{animationDelay: '0.2s'}}>{snackObj.value}</span>
                            )}
                        </div>
                        
                        <p className="text-[#a05b3d] text-[16px] mb-8 font-bold leading-relaxed font-pixel bg-[#f5e4c3] px-4 py-2 border-2 border-[#3d2314] w-full">
                            {isGameFinished ? `최종 기록: ${formatTime(accumulatedTime)}` : `누적 기록: ${formatTime(accumulatedTime)}`}
                        </p>
                        
                        <div className="flex flex-col space-y-4 w-full">
                            {isGameFinished ? (
                                <>
                                    <input 
                                        type="text"
                                        value={nickname}
                                        onChange={e => setNickname(e.target.value)}
                                        placeholder="닉네임 입력 (최대 10자)"
                                        className="p-3 border-4 border-[#3d2314] bg-white text-center font-pixel text-[#3d2314]"
                                        maxLength={10}
                                    />
                                    <button 
                                        onClick={async () => {
                                            if(nickname.trim()) {
                                                await saveRanking(nickname.trim(), accumulatedTime);
                                                onBack();
                                            }
                                        }}
                                        className="retro-btn py-4 text-[12px] bg-[#eebb4d] font-pixel"
                                        disabled={!nickname.trim()}
                                        style={{ opacity: nickname.trim() ? 1 : 0.5 }}
                                    >
                                        명예의 전당 등록하기
                                    </button>
                                </>
                            ) : (
                                <button 
                                    onClick={() => initGame(stage + 1, accumulatedTime)}
                                    className="retro-btn py-4 text-[12px] bg-[#eebb4d] font-pixel"
                                >
                                    다음 단계로 ({stage + 1})
                                </button>
                            )}
                            <button 
                                onClick={() => initGame(1, 0)}
                                className="retro-btn py-3 text-[10px] bg-white font-pixel border-2 border-[#3d2314]"
                            >
                                다시 시작하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isGivingUp && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 modal-overlay px-4">
                    <div className="retro-panel p-8 flex flex-col items-center max-w-sm w-full text-center">
                        <h2 className="title-gold text-2xl mb-6 font-pixel">
                            모험 포기
                        </h2>
                        <p className="text-[#3d2314] text-[14px] mb-8 font-bold font-pixel">
                            정말 포기하고 나가시겠습니까?<br/>
                            <span className="text-[#a05b3d] text-[10px] mt-2 block">(진행된 기록은 모두 삭제됩니다)</span>
                        </p>
                        <div className="flex flex-col space-y-4 w-full">
                            <button 
                                onClick={onBack}
                                className="retro-btn py-4 text-[12px] bg-[#a05b3d] text-white font-pixel"
                            >
                                포기하고 나가기
                            </button>
                            <button 
                                onClick={() => {
                                    setIsGivingUp(false);
                                    if (pauseTime) {
                                        setStageStartTime(prev => prev + (Date.now() - pauseTime));
                                        setPauseTime(null);
                                    }
                                }}
                                className="retro-btn py-3 text-[10px] bg-white font-pixel border-2 border-[#3d2314]"
                            >
                                계속하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const App = () => {
    const [gameState, setGameState] = useState('settings'); // settings | game
    const [config, setConfig] = useState({ character: null, snack: null });

    const handleStart = (character, snack) => {
        setConfig({ character, snack });
        setGameState('game');
    };

    return (
        <div className="w-full min-h-screen flex items-center justify-center py-4 px-2">
            {gameState === 'settings' && (
                <SettingsScreen 
                    onStart={handleStart} 
                />
            )}
            {gameState === 'game' && (
                <GameScreen 
                    characterId={config.character} 
                    snackId={config.snack}
                    onBack={() => setGameState('settings')} 
                />
            )}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
