"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize, Minimize, Volume2, VolumeX, ShieldAlert, CheckCircle, Crosshair, ChevronRight, RefreshCw, Eye, Trophy, AlertCircle } from 'lucide-react';

// ==========================================
// 📁 types/game.ts
// ==========================================
type RiskZone = {
    id: string;
    name: string;
    aiLabel: string;
    description: string;
    x: number; y: number; width: number; height: number;
    confidence: number;
};

type Scene = {
    id: string; title: string; subtitle: string; image: string;
    timeLimit: number; risks: RiskZone[];
    resultMsgEn: string; resultMsgTh: string;
};

type GameState = 'START' | 'REGISTRATION' | 'HOW_TO_PLAY' | 'PLAYING' | 'AI_ANALYZING' | 'AI_RESULT' | 'SCENE_RESULT' | 'FINAL_RESULT' | 'LEADERBOARD';

type PlayerScore = {
    found: string[]; missed: string[];
    score: number; timeBonus: number;
};

type LeaderboardEntry = {
    id: string; player_name: string; total_score: number;
    total_risks_found: number; total_risks: number;
    completed_games: number; played_at: string;
};

// ==========================================
// 📁 data/scenes.ts (UPDATED WITH NEW PROMPT DETAILS)
// ==========================================
const ORIGINAL_SCENES: Scene[] = [
    {
        id: 'scene-01',
        title: 'PPE CHALLENGE', subtitle: 'Spot the PPE Risks',
        image: '/Scene-01-PPE.jpg',
        timeLimit: 10,
        resultMsgEn: 'AI-CiRA CORE detected 4 safety risks in this scene.',
        resultMsgTh: 'AI-CiRA CORE ตรวจพบความเสี่ยง 4 จุดที่คุณอาจมองข้าม!',
        risks: [
            { id: 'r1', name: 'Missing Safety Helmet', aiLabel: 'PPE NOT DETECTED — SAFETY HELMET', description: 'Worker on the left (at the front) is missing a helmet.', x: 26, y: 15, width: 10, height: 15, confidence: 97 },
            { id: 'r2', name: 'Missing Safety Glasses', aiLabel: 'PPE NOT DETECTED — SAFETY GLASSES', description: 'Worker on the left (at the front) is missing safety glasses.', x: 28, y: 24, width: 7, height: 10, confidence: 93 },
            { id: 'r3', name: 'Missing Safety Vest', aiLabel: 'PPE NOT DETECTED — SAFETY VEST', description: 'Workers on the left (front) and far right are missing safety vests.', x: 70, y: 40, width: 15, height: 25, confidence: 95 },
            { id: 'r4', name: 'Improper PPE', aiLabel: 'IMPROPER PPE', description: 'Worker on the far right (wearing a vest) is missing gloves.', x: 60, y: 50, width: 10, height: 15, confidence: 90 },
        ]
    },
    {
        id: 'scene-02',
        title: 'MACHINE SAFETY', subtitle: 'Find the Machine Hazards',
        image: '/Scene-02-Machine.jpg',
        timeLimit: 10,
        resultMsgEn: 'AI-CiRA CORE detected 4 machine safety risks.',
        resultMsgTh: 'AI-CiRA CORE ตรวจพบความเสี่ยงด้านเครื่องจักร 4 จุด',
        risks: [
            { id: 'r1', name: 'Open Machine Guard', aiLabel: 'MACHINE GUARD OPEN', description: 'The guard for the machine on the left is open.', x: 25, y: 45, width: 15, height: 25, confidence: 96 },
            { id: 'r2', name: 'Person Too Close', aiLabel: 'PERSON TOO CLOSE', description: 'Workers are standing too close to the active machine.', x: 41, y: 40, width: 14, height: 45, confidence: 93 },
            { id: 'r3', name: 'Unsafe Operation', aiLabel: 'UNSAFE MACHINE OPERATION', description: 'One worker is interacting with the machine with improper technique.', x: 62, y: 38, width: 15, height: 45, confidence: 95 },
            { id: 'r4', name: 'Missing Warning Sign', aiLabel: 'MISSING WARNING SIGN', description: 'There is no warning sign on the machine.', x: 70, y: 10, width: 15, height: 18, confidence: 88 },
        ]
    },
    {
        id: 'scene-03',
        title: 'WORKPLACE SAFETY', subtitle: 'Find the Workplace Risks',
        image: '/Scene-03-Workplace.jpg',
        timeLimit: 10,
        resultMsgEn: 'AI-CiRA CORE detected 5 workplace safety risks.',
        resultMsgTh: 'AI-CiRA CORE ตรวจพบความเสี่ยงในพื้นที่ทำงาน 5 จุด',
        risks: [
            { id: 'r1', name: 'Cable on Floor', aiLabel: 'CABLE ON FLOOR', description: 'There is a cable on the floor.', x: 20, y: 75, width: 30, height: 18, confidence: 94 },
            { id: 'r2', name: 'Obstruction', aiLabel: 'OBSTRUCTION', description: 'There are objects obstructing the walkway.', x: 55, y: 40, width: 15, height: 20, confidence: 92 },
            { id: 'r3', name: 'Wet Floor', aiLabel: 'WET FLOOR', description: 'The floor is wet.', x: 40, y: 65, width: 40, height: 30, confidence: 96 },
            { id: 'r4', name: 'Improper Storage', aiLabel: 'IMPROPER STORAGE', description: 'Items are stacked on the shelves unsafely.', x: 2, y: 5, width: 25, height: 50, confidence: 89 },
            { id: 'r5', name: 'Blocked Route', aiLabel: 'BLOCKED EMERGENCY ROUTE', description: 'A route is blocked.', x: 65, y: 20, width: 12, height: 35, confidence: 93 },
        ]
    },
    {
        id: 'scene-04',
        title: 'HUMAN BEHAVIOR', subtitle: 'Spot the Unsafe Behavior',
        image: '/Scene-04-Human.jpg',
        timeLimit: 10,
        resultMsgEn: 'AI-CiRA CORE detected 5 unsafe behaviors.',
        resultMsgTh: 'AI-CiRA CORE ตรวจพบพฤติกรรมที่ไม่ปลอดภัย 5 จุด',
        risks: [
            { id: 'r1', name: 'Improper Lifting', aiLabel: 'IMPROPER LIFTING', description: 'A worker is lifting boxes with improper posture.', x: 5, y: 55, width: 25, height: 40, confidence: 95 },
            { id: 'r2', name: 'Phone Usage', aiLabel: 'PHONE USAGE DURING WORK', description: 'A worker is looking at their phone while working.', x: 17, y: 25, width: 15, height: 40, confidence: 92 },
            { id: 'r3', name: 'Restricted Area', aiLabel: 'RESTRICTED AREA', description: 'A worker is working in a restricted area.', x: 41, y: 30, width: 15, height: 40, confidence: 90 },
            { id: 'r4', name: 'Unsafe Posture', aiLabel: 'UNSAFE POSTURE', description: 'A worker is sitting at a computer with improper posture.', x: 55, y: 45, width: 20, height: 35, confidence: 87 },
            { id: 'r5', name: 'Skipped Procedure', aiLabel: 'PROCEDURE VIOLATION', description: 'A worker has skipped safety steps in their task.', x: 84, y: 30, width: 15, height: 40, confidence: 89 },
        ]
    },
    {
        id: 'scene-05',
        title: 'AI CHALLENGE', subtitle: 'Can You Beat AI-CiRA CORE?',
        image: '/Scene-05-Ai.jpg',
        timeLimit: 15,
        resultMsgEn: 'AI-CiRA CORE detected 7 safety risks.',
        resultMsgTh: 'AI-CiRA CORE ตรวจพบความเสี่ยงทั้งหมด 7 จุด',
        risks: [
            { id: 'r1', name: 'No Hard Hat', aiLabel: 'PPE NOT DETECTED', description: 'A worker is standing on an elevated platform without a helmet.', x: 90, y: 32, width: 10, height: 28, confidence: 97 },
            { id: 'r2', name: 'Machine Hazard', aiLabel: 'MACHINE HAZARD', description: 'There are exposed machinery parts.', x: 20, y: 15, width: 15, height: 35, confidence: 94 },
            { id: 'r3', name: 'Unsafe Behavior', aiLabel: 'UNSAFE BEHAVIOR', description: 'A worker is operating a forklift without wearing a seatbelt.', x: 60, y: 35, width: 18, height: 45, confidence: 91 },
            { id: 'r4', name: 'Cable on Floor', aiLabel: 'CABLE ON FLOOR', description: 'There are multiple cables scattered across the floor.', x: 35, y: 70, width: 25, height: 18, confidence: 96 },
            { id: 'r5', name: 'Improper Storage', aiLabel: 'IMPROPER STORAGE', description: 'Items are poorly stored.', x: 0, y: 40, width: 20, height: 50, confidence: 88 },
            { id: 'r6', name: 'Wet Floor', aiLabel: 'WET FLOOR', description: 'Large puddles are on the floor.', x: 25, y: 80, width: 35, height: 20, confidence: 93 },
            { id: 'r7', name: 'Blocked Route', aiLabel: 'BLOCKED EMERGENCY ROUTE', description: 'Paths are blocked by pallets.', x: 55, y: 65, width: 25, height: 30, confidence: 90 },
        ]
    }
];

// ==========================================
// 📁 lib/supabase.ts (MOCK FOR PREVIEW)
// ==========================================
// In production, replace this with actual Supabase client initialization:
// import { createClient } from '@supabase/supabase-js';
// export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const MOCK_DB_KEY = 'aicira_leaderboard_mock';
const saveScoreToDB = async (data: Omit<LeaderboardEntry, 'id'>) => {
    try {
        // SIMULATED SUPABASE INSERT
        const existing = JSON.parse(localStorage.getItem(MOCK_DB_KEY) || '[]');
        const newRecord = { ...data, id: crypto.randomUUID() };
        existing.push(newRecord);
        localStorage.setItem(MOCK_DB_KEY, JSON.stringify(existing));
        console.log("Score saved to database:", newRecord);
        return { success: true };
    } catch (error) {
        console.error("Failed to save score", error);
        return { success: false };
    }
};

const getLeaderboardFromDB = async (): Promise<LeaderboardEntry[]> => {
    try {
        // SIMULATED SUPABASE QUERY
        const data = JSON.parse(localStorage.getItem(MOCK_DB_KEY) || '[]') as LeaderboardEntry[];
        // Sort by Score DESC, then PlayedAt ASC
        return data.sort((a, b) => {
            if (b.total_score !== a.total_score) return b.total_score - a.total_score;
            return new Date(a.played_at).getTime() - new Date(b.played_at).getTime();
        }).slice(0, 10);
    } catch (error) {
        console.error("Failed to fetch leaderboard", error);
        return [];
    }
};

// Populate fake initial data if empty
if (typeof window !== 'undefined' && !localStorage.getItem(MOCK_DB_KEY)) {
    const fakeData = [
        { player_name: 'Somchai S.', total_score: 2850, total_risks_found: 14, total_risks: 15, completed_games: 3, played_at: new Date(Date.now() - 100000).toISOString() },
        { player_name: 'Nadech K.', total_score: 2720, total_risks_found: 13, total_risks: 15, completed_games: 3, played_at: new Date(Date.now() - 200000).toISOString() },
        { player_name: 'Yaya U.', total_score: 2650, total_risks_found: 13, total_risks: 15, completed_games: 3, played_at: new Date(Date.now() - 50000).toISOString() },
        { player_name: 'Piti B.', total_score: 2480, total_risks_found: 12, total_risks: 15, completed_games: 3, played_at: new Date(Date.now() - 300000).toISOString() },
        { player_name: 'Ananda', total_score: 2370, total_risks_found: 11, total_risks: 15, completed_games: 3, played_at: new Date(Date.now() - 400000).toISOString() },
    ];
    localStorage.setItem(MOCK_DB_KEY, JSON.stringify(fakeData));
}


// ==========================================
// 📁 components/UIComponents.tsx
// ==========================================
const NeonText = ({ children, className = '', as = 'h1' }: { children: React.ReactNode, className?: string, as?: any }) => {
    const Component = as;
    return (
        <Component className={`text-transparent bg-clip-text bg-gradient-to-r from-[#00d2ff] to-[#3a7bd5] drop-shadow-[0_0_8px_rgba(0,210,255,0.8)] ${className}`}>
            {children}
        </Component>
    );
};

const FuturisticButton = ({ onClick, children, primary = true, className = '', disabled = false }: any) => (
    <motion.button
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        onClick={onClick} disabled={disabled}
        className={`relative px-8 py-4 uppercase font-bold tracking-widest overflow-hidden group
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${primary ? 'bg-[#00d2ff]/10 text-[#00d2ff] border border-[#00d2ff]' : 'bg-transparent text-white border border-white/30'}
            ${className}`}
        style={{ boxShadow: primary && !disabled ? '0 0 15px rgba(0, 210, 255, 0.3), inset 0 0 10px rgba(0, 210, 255, 0.1)' : 'none' }}
    >
        {primary && !disabled && <span className="absolute inset-0 bg-[#00d2ff]/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />}
        <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
        {primary && !disabled && (
            <>
                <span className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#00d2ff]" />
                <span className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#00d2ff]" />
                <span className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#00d2ff]" />
                <span className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#00d2ff]" />
            </>
        )}
    </motion.button>
);


// ==========================================
// 📁 app/page.tsx (MAIN LOGIC)
// ==========================================
export default function App() {
    // Game Global State
    const [gameState, setGameState] = useState<GameState>('START');
    const [playerName, setPlayerName] = useState('');
    const [roundScenes, setRoundScenes] = useState<Scene[]>([]);
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [scores, setScores] = useState<Record<string, PlayerScore>>({});
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
    
    // Preferences
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Audio Utility
    const playSound = useCallback((type: 'start' | 'correct' | 'wrong' | 'scan' | 'complete' | 'error') => {
        if (!soundEnabled) return;
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            const now = ctx.currentTime;
            
            if (type === 'correct') {
                osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
                gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.3, now + 0.05); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now); osc.stop(now + 0.2);
            } else if (type === 'wrong' || type === 'error') {
                osc.type = 'triangle'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
                gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.2, now + 0.05); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now); osc.stop(now + 0.15);
            } else if (type === 'scan') {
                osc.type = 'square'; osc.frequency.setValueAtTime(400, now); gain.gain.setValueAtTime(0.05, now);
                for(let i=0; i<10; i++) osc.frequency.setValueAtTime(400 + (i%2*100), now + (i*0.1));
                osc.start(now); osc.stop(now + 1);
            } else if (type === 'start' || type === 'complete') {
                osc.type = 'triangle'; osc.frequency.setValueAtTime(type === 'start' ? 440 : 880, now);
                gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                osc.start(now); osc.stop(now + 0.5);
            }
        } catch (e) { /* ignore */ }
    }, [soundEnabled]);

    // Auto Reset Logic (Only on Leaderboard)
    const resetIdleTimer = useCallback(() => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (gameState === 'LEADERBOARD') {
             idleTimerRef.current = setTimeout(() => {
                resetToRegistration();
            }, 30000); // 30 seconds idle return to Registration
        }
    }, [gameState]);

    useEffect(() => {
        window.addEventListener('mousemove', resetIdleTimer); window.addEventListener('touchstart', resetIdleTimer);
        resetIdleTimer();
        return () => {
            window.removeEventListener('mousemove', resetIdleTimer); window.removeEventListener('touchstart', resetIdleTimer);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [resetIdleTimer]);

    // Game Actions
    const handleStartClick = () => setGameState('REGISTRATION');
    
    const handleRegistrationSubmit = (name: string) => {
        setPlayerName(name);
        // Shuffle and pick exactly 3 scenes
        const shuffled = [...ORIGINAL_SCENES].sort(() => 0.5 - Math.random()).slice(0, 3);
        setRoundScenes(shuffled);
        playSound('start');
        setGameState('HOW_TO_PLAY');
    };

    const handleSceneFinish = (scoreData: PlayerScore) => {
        setScores(prev => ({ ...prev, [roundScenes[currentSceneIndex].id]: scoreData }));
        setGameState('AI_ANALYZING');
        playSound('scan');
    };

    const handleNextScene = () => {
        if (currentSceneIndex < roundScenes.length - 1) {
            setCurrentSceneIndex(prev => prev + 1);
            setGameState('PLAYING');
            playSound('start');
        } else {
            calculateAndSaveFinalScore();
        }
    };

    const calculateAndSaveFinalScore = async () => {
        setGameState('FINAL_RESULT');
        playSound('complete');
        
        let totalScore = 0;
        let totalRisksFound = 0;
        let totalRisks = roundScenes.reduce((acc, scene) => acc + scene.risks.length, 0);

        Object.values(scores).forEach(score => {
            totalScore += score.score + score.timeBonus;
            totalRisksFound += score.found.length;
        });

        // Save to Database
        await saveScoreToDB({
            player_name: playerName,
            total_score: totalScore,
            total_risks_found: totalRisksFound,
            total_risks: totalRisks,
            completed_games: 3, // Per round
            played_at: new Date().toISOString()
        });

        // Fetch Leaderboard for next screen
        const lbData = await getLeaderboardFromDB();
        setLeaderboardData(lbData);
    };

    const resetToRegistration = () => {
        setGameState('REGISTRATION');
        setPlayerName('');
        setRoundScenes([]);
        setCurrentSceneIndex(0);
        setScores({});
    };

    // Fullscreen toggle
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Screen Routing Render
    return (
        <div ref={containerRef} className="w-full h-screen bg-[#040814] text-white font-sans overflow-hidden select-none touch-none">
            {/* Global Controls */}
            <div className="absolute top-4 right-4 z-50 flex gap-4">
                <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-3 bg-black/40 border border-white/20 rounded-full hover:bg-white/10 backdrop-blur-md">
                    {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6 text-gray-500" />}
                </button>
                <button onClick={toggleFullscreen} className="p-3 bg-black/40 border border-white/20 rounded-full hover:bg-white/10 backdrop-blur-md">
                    {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
                </button>
            </div>

            <AnimatePresence mode="wait">
                {/* 1. START */}
                {gameState === 'START' && (
                    <motion.div key="start" className="w-full h-full absolute inset-0 flex flex-col items-center justify-center text-center z-10 space-y-12" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                        <div className="absolute inset-0 bg-[url('https://placehold.co/1920x1080/060b19/00d2ff?text=Industrial+Background')] opacity-20 bg-cover bg-center mix-blend-screen" />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1128]/80 to-[#0a1128] z-0" />
                        <div className="z-10 flex flex-col items-center">
                            <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4 inline-flex items-center gap-3 px-6 py-2 border border-[#00d2ff]/30 rounded-full bg-[#00d2ff]/10 backdrop-blur-sm">
                                <Eye className="w-5 h-5 text-[#00d2ff]" />
                                <span className="text-[#00d2ff] font-mono tracking-widest text-sm">SYSTEM ONLINE</span>
                            </motion.div>
                            <NeonText className="text-7xl md:text-8xl font-black mb-2 tracking-tighter">AI-CiRA CORE</NeonText>
                            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-widest mb-8">SAFETY CHALLENGE</h2>
                            <div className="bg-black/40 border border-white/10 p-6 backdrop-blur-md max-w-2xl w-full mx-4 rounded-lg">
                                <p className="text-2xl text-[#00d2ff] font-light italic">"Can You Spot the Risk?"</p>
                            </div>
                        </div>
                        <FuturisticButton onClick={handleStartClick} className="text-2xl px-12 py-6 z-10">
                            ENTER SYSTEM <ChevronRight className="w-8 h-8" />
                        </FuturisticButton>
                        <div className="absolute bottom-8 z-10 text-white/50 text-sm tracking-wider font-mono">Powered by Siam Rikken Industrial Co., Ltd.</div>
                    </motion.div>
                )}

                {/* 2. REGISTRATION */}
                {gameState === 'REGISTRATION' && (
                    <RegistrationScreen key="reg" onSubmit={handleRegistrationSubmit} playSound={playSound} />
                )}

                {/* 3. HOW TO PLAY */}
                {gameState === 'HOW_TO_PLAY' && (
                    <motion.div key="htp" className="w-full h-full absolute inset-0 flex flex-col items-center justify-center p-8 z-10" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                        <NeonText className="text-5xl font-bold mb-16 tracking-widest">HOW TO PLAY</NeonText>
                        <div className="flex flex-col md:flex-row gap-8 max-w-6xl w-full mb-16">
                            {[
                                { step: '01', title: 'LOOK', desc: 'Carefully observe the workplace.', icon: <Eye className="w-12 h-12" /> },
                                { step: '02', title: 'FIND', desc: 'Tap the areas you think are unsafe. (Max 3 wrong attempts!)', icon: <Crosshair className="w-12 h-12" /> },
                                { step: '03', title: 'SCORE', desc: 'Complete 3 random challenges before time runs out.', icon: <Trophy className="w-12 h-12" /> }
                            ].map((item, idx) => (
                                <motion.div key={item.step} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.2 }} className="flex-1 bg-[#0a1128]/80 border border-[#00d2ff]/30 p-8 flex flex-col items-center text-center relative group">
                                    <div className="text-[#00d2ff] mb-6 opacity-80 group-hover:scale-110 transition-transform">{item.icon}</div>
                                    <h3 className="text-2xl font-bold text-white mb-2 flex flex-col items-center"><span className="text-[#00d2ff] text-sm font-mono tracking-widest mb-2">STEP {item.step}</span>{item.title}</h3>
                                    <p className="text-gray-400 mt-4">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                        <FuturisticButton onClick={() => { setGameState('PLAYING'); playSound('start'); }} className="px-10 py-4">
                            START CHALLENGE 1
                        </FuturisticButton>
                    </motion.div>
                )}

                {/* 4. PLAYING */}
                {gameState === 'PLAYING' && (
                    <GameScene key={`scene-${currentSceneIndex}`} scene={roundScenes[currentSceneIndex]} index={currentSceneIndex} total={3} onFinish={handleSceneFinish} playSound={playSound} />
                )}

                {/* 5. AI ANALYZING */}
                {gameState === 'AI_ANALYZING' && (
                    <AIAnalyzingScreen key="ai-analyze" onComplete={() => setGameState('AI_RESULT')} />
                )}

                {/* 6. AI RESULT (Showing boxes) */}
                {gameState === 'AI_RESULT' && (
                    <AIResultScreen key="ai-result" scene={roundScenes[currentSceneIndex]} scoreData={scores[roundScenes[currentSceneIndex].id]} onComplete={() => setGameState('SCENE_RESULT')} />
                )}

                {/* 7. SCENE RESULT */}
                {gameState === 'SCENE_RESULT' && (
                    <SceneResultScreen key="scene-res" scene={roundScenes[currentSceneIndex]} index={currentSceneIndex} total={3} scoreData={scores[roundScenes[currentSceneIndex].id]} onNext={handleNextScene} />
                )}

                {/* 8. FINAL RESULT */}
                {gameState === 'FINAL_RESULT' && (
                    <FinalResultScreen key="final" playerName={playerName} scores={scores} scenes={roundScenes} onContinue={() => setGameState('LEADERBOARD')} />
                )}

                {/* 9. LEADERBOARD */}
                {gameState === 'LEADERBOARD' && (
                    <LeaderboardScreen key="lb" playerName={playerName} leaderboardData={leaderboardData} onPlayAgain={resetToRegistration} />
                )}
            </AnimatePresence>

            {/* Global CSS for Animations */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes scan { 0% { background-position: 0 -100vh; } 100% { background-position: 0 100vh; } }
                body { margin: 0; background-color: #040814; overscroll-behavior-y: contain; }
            `}} />
        </div>
    );
}


// ==========================================
// 📁 components/Screens.tsx
// ==========================================

/* --- REGISTRATION SCREEN --- */
const RegistrationScreen = ({ onSubmit, playSound }: { onSubmit: (name: string) => void, playSound: any }) => {
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (trimmed.length === 0) {
            setError('Please enter your name.');
            playSound('error');
            return;
        }
        if (trimmed.length > 40) {
            setError('Name is too long (max 40 chars).');
            playSound('error');
            return;
        }
        onSubmit(trimmed);
    };

    return (
        <motion.div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center z-10 p-4 bg-[#0a1128]" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(0,210,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,210,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-black/60 border border-[#00d2ff]/30 backdrop-blur-md p-10 rounded-xl max-w-lg w-full text-center shadow-[0_0_30px_rgba(0,210,255,0.1)]">
                <ShieldAlert className="w-16 h-16 text-[#00d2ff] mx-auto mb-6" />
                <NeonText className="text-3xl font-bold mb-2">PLAYER REGISTRATION</NeonText>
                <p className="text-gray-400 font-mono mb-8 text-sm">Enter your name to initiate session.</p>
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => { setName(e.target.value); setError(''); }}
                            placeholder="Please enter your name"
                            className="w-full bg-black/50 border border-[#00d2ff]/50 text-white text-center text-xl p-4 rounded focus:outline-none focus:border-[#00ff88] focus:shadow-[0_0_15px_rgba(0,255,136,0.2)] transition-all font-mono"
                            maxLength={40}
                            autoFocus
                        />
                        {error && <p className="text-red-500 text-sm mt-2 font-mono flex items-center justify-center gap-1"><AlertCircle className="w-4 h-4"/>{error}</p>}
                    </div>
                    <FuturisticButton onClick={handleSubmit} className="w-full py-4 text-lg">
                        START CHALLENGE
                    </FuturisticButton>
                </form>
            </motion.div>
        </motion.div>
    );
};

/* --- GAME SCENE SCREEN --- */
const GameScene = ({ scene, index, total, onFinish, playSound }: { scene: Scene, index: number, total: number, onFinish: (s: PlayerScore) => void, playSound: any }) => {
    const [timeLeft, setTimeLeft] = useState(scene.timeLimit);
    const [foundRisks, setFoundRisks] = useState<string[]>([]);
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const [tappedCorrectIds, setTappedCorrectIds] = useState<{x: number, y: number, id: string}[]>([]);
    const [missedTaps, setMissedTaps] = useState<{x: number, y: number, id: number}[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const missedTapCounter = useRef(0);

    useEffect(() => {
        if (timeLeft > 0 && wrongAttempts < 3 && foundRisks.length < scene.risks.length) {
            timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (timeLeft === 0 || wrongAttempts >= 3 || foundRisks.length === scene.risks.length) {
            handleEndScene();
        }
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [timeLeft, wrongAttempts, foundRisks.length]);

    const handleEndScene = () => {
        const missed = scene.risks.map(r => r.id).filter(id => !foundRisks.includes(id));
        const score = foundRisks.length * 100;
        const timeBonus = (foundRisks.length === scene.risks.length) ? Math.floor((timeLeft / scene.timeLimit) * 50) : 0;
        onFinish({ found: foundRisks, missed, score, timeBonus });
    };

    const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
        if (timeLeft === 0 || wrongAttempts >= 3) return;
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;

        // 🛠️ HELPER TOOL: พิมพ์พิกัด X, Y ออกมาทาง Console (เอาไว้ใช้ตอนหาระยะรูปภาพใหม่)
        console.log(`[Developer Tool] Clicked at -> X: ${Math.round(x)}, Y: ${Math.round(y)}`);

        let hit = false;
        let alreadyFound = false;

        for (const risk of scene.risks) {
            const padding = 2; // Hitbox padding
            if (x >= (risk.x - padding) && x <= (risk.x + risk.width + padding) &&
                y >= (risk.y - padding) && y <= (risk.y + risk.height + padding)) {
                hit = true;
                if (foundRisks.includes(risk.id)) {
                    alreadyFound = true; // No penalty, no score
                } else {
                    setFoundRisks(prev => [...prev, risk.id]);
                    setTappedCorrectIds(prev => [...prev, { x, y, id: risk.id }]);
                    playSound('correct');
                    setTimeout(() => setTappedCorrectIds(prev => prev.filter(t => t.id !== risk.id)), 1500);
                }
                break;
            }
        }

        if (!hit && !alreadyFound) {
            playSound('error');
            setWrongAttempts(prev => prev + 1);
            const mid = ++missedTapCounter.current;
            setMissedTaps(prev => [...prev, { x, y, id: mid }]);
            setTimeout(() => setMissedTaps(prev => prev.filter(m => m.id !== mid)), 500);
        }
    };

    return (
        <motion.div className="flex flex-col h-full w-full absolute inset-0 z-10" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            {/* HUD */}
            <div className="flex justify-between items-center p-4 bg-[#0a1128] border-b border-[#00d2ff]/30 z-20">
                <div className="flex flex-col">
                    <span className="text-[#00d2ff] font-mono text-sm tracking-widest">CHALLENGE {index + 1} / {total}</span>
                    <h2 className="text-white text-xl md:text-2xl font-bold tracking-wider">{scene.title}</h2>
                </div>
                <div className="flex items-center gap-4 md:gap-8">
                    {/* Wrong Attempts */}
                    <div className="flex flex-col items-center bg-black/40 px-4 py-2 border border-white/10 rounded-lg">
                        <span className="text-gray-400 text-[10px] font-mono mb-1">WRONG ATTEMPTS</span>
                        <div className="flex gap-2">
                            {[0, 1, 2].map(i => (
                                <div key={i} className={`w-4 h-4 rounded-full border-2 transition-colors ${i < wrongAttempts ? 'bg-red-500 border-red-500 shadow-[0_0_8px_red]' : 'border-gray-500 bg-transparent'}`} />
                            ))}
                        </div>
                    </div>
                    {/* Risk Counter */}
                    <div className="flex flex-col items-center bg-black/40 px-4 py-2 border border-white/10 rounded-lg">
                        <span className="text-gray-400 text-[10px] font-mono mb-1">RISKS DETECTED</span>
                        <div className="text-2xl font-mono text-[#00ff88]">{foundRisks.length} <span className="text-gray-500 text-lg">/ {scene.risks.length}</span></div>
                    </div>
                    {/* Timer */}
                    <div className={`flex flex-col items-center px-4 py-2 border rounded-lg ${timeLeft <= 3 ? 'bg-red-900/20 border-red-500 animate-pulse' : 'bg-black/40 border-white/10'}`}>
                        <span className="text-gray-400 text-[10px] font-mono mb-1">TIME LEFT</span>
                        <div className={`text-2xl font-mono ${timeLeft <= 3 ? 'text-red-500' : 'text-white'}`}>00:{String(timeLeft).padStart(2, '0')}</div>
                    </div>
                    <FuturisticButton primary={false} onClick={handleEndScene} className="px-4 py-2 text-xs md:text-sm hidden md:flex">FINISH</FuturisticButton>
                </div>
            </div>

            {/* Game Canvas */}
            <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center touch-none">
                <div className="relative w-full h-full max-w-full max-h-full aspect-video cursor-crosshair" onMouseDown={handleTap} onTouchStart={handleTap}>
                    <img src={scene.image} alt="Scene" className="w-full h-full object-cover pointer-events-none select-none" draggable={false} />
                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,rgba(0,210,255,0)_0%,rgba(0,210,255,0.05)_50%,rgba(0,210,255,0)_100%)] bg-[length:100%_4px] animate-[scan_4s_linear_infinite]" />
                    
                    {/* Found Indicator (Popup) */}
                    <AnimatePresence>
                        {tappedCorrectIds.map(tap => (
                            <motion.div key={tap.id} initial={{ opacity: 0, y: 10, scale: 0.8 }} animate={{ opacity: 1, y: -20, scale: 1 }} exit={{ opacity: 0, scale: 1.2 }}
                                className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 border border-[#00ff88] px-2 py-1 rounded"
                                style={{ left: `${tap.x}%`, top: `${tap.y}%` }}>
                                <span className="text-[#00ff88] font-bold text-xs tracking-wider whitespace-nowrap">RISK FOUND +100</span>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Missed Indicator */}
                    <AnimatePresence>
                        {missedTaps.map(tap => (
                            <motion.div key={tap.id} initial={{ opacity: 0.8, scale: 0.5 }} animate={{ opacity: 0, scale: 2 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
                                className="absolute pointer-events-none z-10 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-red-500 bg-red-500/20"
                                style={{ left: `${tap.x}%`, top: `${tap.y}%` }} />
                        ))}
                    </AnimatePresence>

                    {/* Persist Found Zones visually? Optional, but keeping them hidden keeps it clean as requested. */}
                </div>
            </div>
        </motion.div>
    );
};

/* --- AI ANALYZING SCREEN --- */
const AIAnalyzingScreen = ({ onComplete }: { onComplete: () => void }) => {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('INITIALIZING AI');
    useEffect(() => {
        const steps = [
            { p: 10, s: 'IMAGE DETECTED' }, { p: 35, s: 'OBJECT ANALYSIS' },
            { p: 65, s: 'SAFETY ANALYSIS' }, { p: 90, s: 'RISK DETECTION' },
            { p: 100, s: 'ANALYSIS COMPLETE' }
        ];
        let currentStep = 0;
        const interval = setInterval(() => {
            if (currentStep < steps.length) {
                setProgress(steps[currentStep].p); setStatus(steps[currentStep].s);
                currentStep++;
            } else {
                clearInterval(interval); setTimeout(onComplete, 500);
            }
        }, 400);
        return () => clearInterval(interval);
    }, [onComplete]);

    return (
        <motion.div className="flex flex-col items-center justify-center h-full w-full bg-[#040814] absolute inset-0 z-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,210,255,0.1)_0%,rgba(0,0,0,0)_70%)]" />
            <div className="z-10 flex flex-col items-center w-full max-w-md px-8">
                <ShieldAlert className="text-[#00d2ff] w-24 h-24 mb-8 animate-pulse" />
                <NeonText as="h2" className="text-3xl font-bold mb-2 tracking-widest text-center">AI-CiRA CORE</NeonText>
                <p className="text-[#00d2ff] font-mono text-xl mb-12 animate-pulse">ANALYZING IMAGE...</p>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-4 border border-gray-700">
                    <motion.div className="h-full bg-[#00d2ff] shadow-[0_0_10px_#00d2ff]" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between w-full font-mono text-xs text-gray-400">
                    <span>{status}</span><span>{progress}%</span>
                </div>
            </div>
        </motion.div>
    );
};

/* --- AI RESULT (REVEAL) SCREEN --- */
const AIResultScreen = ({ scene, scoreData, onComplete }: { scene: Scene, scoreData: PlayerScore, onComplete: () => void }) => {
    const [visible, setVisible] = useState<string[]>([]);
    useEffect(() => {
        let delay = 0;
        scene.risks.forEach((risk) => {
            setTimeout(() => setVisible(p => [...p, risk.id]), delay);
            delay += 300;
        });
        const tid = setTimeout(onComplete, delay + 1500);
        return () => clearTimeout(tid);
    }, [scene, onComplete]);

    return (
        <motion.div className="flex flex-col h-full w-full bg-black absolute inset-0 z-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute top-4 left-4 z-30 bg-black/70 border border-[#00d2ff] p-4 backdrop-blur-sm rounded">
                <h3 className="text-[#00d2ff] font-bold tracking-widest mb-1 flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> AI-CiRA CORE</h3>
            </div>
            <div className="relative w-full h-full max-w-full max-h-full aspect-video flex items-center justify-center">
                <img src={scene.image} alt="Scene" className="w-full h-full object-cover opacity-50" />
                <AnimatePresence>
                    {scene.risks.map((risk) => {
                        const isFound = scoreData?.found.includes(risk.id);
                        return visible.includes(risk.id) && (
                            <motion.div key={risk.id} initial={{ opacity: 0, scale: 1.2 }} animate={{ opacity: 1, scale: 1 }}
                                className="absolute border-2 z-20" style={{ left: `${risk.x}%`, top: `${risk.y}%`, width: `${risk.width}%`, height: `${risk.height}%`, borderColor: isFound ? '#00ff88' : '#ff9900' }}>
                                <div className="absolute bottom-full left-0 mb-1 whitespace-nowrap bg-black/90 border text-xs font-mono p-1 flex items-center gap-2" style={{ borderColor: isFound ? '#00ff88' : '#ff9900' }}>
                                    <span className={isFound ? 'text-[#00ff88]' : 'text-[#ff9900]'}>{risk.aiLabel}</span>
                                    <span className="text-gray-400 bg-gray-900 px-1 rounded">{risk.confidence}%</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

/* --- SCENE RESULT SCREEN --- */
const SceneResultScreen = ({ scene, index, total, scoreData, onNext }: { scene: Scene, index: number, total: number, scoreData: PlayerScore, onNext: () => void }) => {
    const totalRisks = scene.risks.length;
    const found = scoreData?.found.length || 0;
    const msg = found === totalRisks ? "Excellent! You found all detected risks." : `AI-CiRA CORE found ${totalRisks - found} risk(s) you missed.`;

    return (
        <motion.div className="flex flex-col items-center justify-center h-full w-full absolute inset-0 z-10 bg-[#0a1128]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="z-10 bg-black/60 border border-[#00d2ff]/30 backdrop-blur-md p-12 rounded-xl max-w-3xl w-full mx-4 shadow-[0_0_30px_rgba(0,210,255,0.1)]">
                <h2 className="text-center text-[#00d2ff] font-mono tracking-widest mb-2">SCENE RESULT</h2>
                <NeonText as="h3" className="text-3xl text-center font-bold mb-12">{scene.title}</NeonText>
                
                <div className="grid grid-cols-2 gap-8 mb-10">
                    <div className="flex flex-col items-center p-6 border border-white/10 rounded-lg bg-white/5 relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00ff88] to-transparent" />
                        <h3 className="text-gray-400 font-mono text-sm mb-4">YOUR DETECTION</h3>
                        <div className="text-5xl font-bold text-white mb-2">{found} <span className="text-2xl text-gray-500">/ {totalRisks}</span></div>
                    </div>
                    <div className="flex flex-col items-center p-6 border border-[#00d2ff]/30 rounded-lg bg-[#00d2ff]/5 relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00d2ff] to-transparent" />
                        <h3 className="text-[#00d2ff] font-mono text-sm mb-4 flex items-center gap-2"><ShieldAlert className="w-4 h-4"/> AI-CiRA CORE</h3>
                        <div className="text-5xl font-bold text-white mb-2">{totalRisks} <span className="text-2xl text-gray-500">/ {totalRisks}</span></div>
                    </div>
                </div>
                <p className={`text-center text-xl font-light mb-10 ${found === totalRisks ? 'text-[#00ff88]' : 'text-gray-300'}`}>{msg}</p>
                <div className="flex justify-center">
                    <FuturisticButton onClick={onNext} className="px-12 py-4">
                        {index < total - 1 ? `PROCEED TO CHALLENGE ${index + 2}` : 'VIEW FINAL RESULTS'}
                    </FuturisticButton>
                </div>
            </div>
        </motion.div>
    );
};

/* --- FINAL RESULT SCREEN --- */
const FinalResultScreen = ({ playerName, scores, scenes, onContinue }: { playerName: string, scores: Record<string, PlayerScore>, scenes: Scene[], onContinue: () => void }) => {
    const totalRisks = scenes.reduce((a, s) => a + s.risks.length, 0);
    const totalFound = Object.values(scores).reduce((a, s) => a + s.found.length, 0);
    const totalScore = Object.values(scores).reduce((a, s) => a + s.score + s.timeBonus, 0);
    const pct = (totalFound / totalRisks) * 100;
    
    let level = 'SAFETY EXPLORER'; let color = 'text-gray-300';
    if (pct > 30) { level = 'SAFETY SCOUT'; color = 'text-blue-400'; }
    if (pct > 60) { level = 'SAFETY DETECTIVE'; color = 'text-[#00d2ff]'; }
    if (pct > 80) { level = 'SAFETY EXPERT'; color = 'text-purple-400'; }
    if (pct === 100) { level = 'SAFETY MASTER'; color = 'text-[#00ff88]'; }

    return (
        <motion.div className="flex flex-col items-center justify-center h-full w-full absolute inset-0 z-10 p-4 bg-[#0a1128]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,210,255,0.15)_0%,rgba(10,17,40,1)_80%)]" />
            <div className="z-10 flex flex-col items-center w-full max-w-4xl">
                <NeonText as="h2" className="text-5xl md:text-6xl font-black mb-4 text-center tracking-widest">CHALLENGE COMPLETE</NeonText>
                <p className="text-xl font-mono text-gray-300 mb-8 uppercase tracking-widest">OPERATOR: <span className="text-white font-bold">{playerName}</span></p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
                    <div className="bg-black/40 border border-white/10 p-8 rounded-xl flex flex-col items-center justify-center col-span-1 md:col-span-3">
                        <h3 className="text-gray-400 font-mono mb-2">TOTAL SCORE</h3>
                        <div className="text-7xl font-bold text-white tracking-tighter">{totalScore.toLocaleString()}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-6 rounded-xl flex flex-col items-center text-center">
                        <h3 className="text-gray-400 font-mono text-sm mb-4">YOUR DETECTION</h3>
                        <div className="text-5xl font-bold text-white mb-2">{totalFound} <span className="text-2xl text-gray-500">/ {totalRisks}</span></div>
                    </div>
                    <div className="bg-[#00d2ff]/5 border border-[#00d2ff]/30 p-6 rounded-xl flex flex-col items-center text-center">
                        <h3 className="text-[#00d2ff] font-mono text-sm mb-4 flex items-center gap-2"><ShieldAlert className="w-4 h-4"/> AI-CiRA CORE</h3>
                        <div className="text-5xl font-bold text-white mb-2">{totalRisks} <span className="text-2xl text-gray-500">/ {totalRisks}</span></div>
                    </div>
                    <div className="bg-black/60 border border-white/20 p-6 rounded-xl flex flex-col items-center text-center relative overflow-hidden md:col-span-3">
                        <h3 className="text-gray-400 font-mono text-sm mb-2">ASSIGNED RANK</h3>
                        <div className={`text-3xl md:text-5xl font-black tracking-wider ${color} drop-shadow-lg`}>{level}</div>
                    </div>
                </div>
                <FuturisticButton onClick={onContinue} className="px-16 py-5 text-xl">VIEW LEADERBOARD</FuturisticButton>
            </div>
        </motion.div>
    );
};

/* --- LEADERBOARD SCREEN --- */
const LeaderboardScreen = ({ playerName, leaderboardData, onPlayAgain }: { playerName: string, leaderboardData: LeaderboardEntry[], onPlayAgain: () => void }) => {
    const top3 = leaderboardData.slice(0, 3);
    const rest = leaderboardData.slice(3, 10);

    const PodiumItem = ({ rank, player, score, isCurrent }: any) => {
        const heights = ['h-48', 'h-36', 'h-24'];
        const colors = ['bg-[#FFD700]', 'bg-[#C0C0C0]', 'bg-[#CD7F32]'];
        const textColors = ['text-[#FFD700]', 'text-[#C0C0C0]', 'text-[#CD7F32]'];
        
        return (
            <div className={`flex flex-col items-center justify-end ${rank === 0 ? 'order-2' : rank === 1 ? 'order-1' : 'order-3'} w-1/3 px-2`}>
                <div className={`text-lg font-bold truncate w-full text-center mb-1 ${isCurrent ? 'text-white bg-white/20 rounded px-1' : 'text-gray-300'}`}>{player}</div>
                <div className={`text-xl font-mono font-bold mb-2 ${textColors[rank]}`}>{score.toLocaleString()}</div>
                <div className={`w-full ${heights[rank]} ${colors[rank]}/20 border-t-4 border-l border-r border-b-0 ${colors[rank].replace('bg-', 'border-')} rounded-t-lg flex items-start justify-center pt-4 relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                    <span className={`text-4xl font-black ${textColors[rank]} drop-shadow-lg`}>{rank === 0 ? '1' : rank === 1 ? '2' : '3'}</span>
                </div>
            </div>
        );
    };

    return (
        <motion.div className="flex flex-col items-center justify-start h-full w-full absolute inset-0 z-10 pt-12 pb-8 px-4 bg-[#0a1128] overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <NeonText as="h2" className="text-4xl font-black mb-8 tracking-widest">TOP 10 SAFETY DETECTIVES</NeonText>
            
            {/* Podium for Top 3 */}
            {top3.length > 0 && (
                <div className="flex items-end justify-center w-full max-w-3xl h-64 mb-12">
                    {top3[1] && <PodiumItem rank={1} player={top3[1].player_name} score={top3[1].total_score} isCurrent={top3[1].player_name === playerName} />}
                    {top3[0] && <PodiumItem rank={0} player={top3[0].player_name} score={top3[0].total_score} isCurrent={top3[0].player_name === playerName} />}
                    {top3[2] && <PodiumItem rank={2} player={top3[2].player_name} score={top3[2].total_score} isCurrent={top3[2].player_name === playerName} />}
                </div>
            )}

            {/* List for 4-10 */}
            {rest.length > 0 && (
                <div className="w-full max-w-2xl bg-black/40 border border-white/10 rounded-xl p-6 mb-12">
                    {rest.map((entry, idx) => (
                        <div key={entry.id || idx} className={`flex justify-between items-center py-3 border-b border-white/5 last:border-0 ${entry.player_name === playerName ? 'bg-white/10 rounded px-2 -mx-2' : ''}`}>
                            <div className="flex items-center gap-4">
                                <span className="text-gray-500 font-mono w-6">#{idx + 4}</span>
                                <span className={`font-bold ${entry.player_name === playerName ? 'text-white' : 'text-gray-300'}`}>{entry.player_name}</span>
                            </div>
                            <span className="font-mono text-[#00d2ff]">{entry.total_score.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            )}

            <FuturisticButton onClick={onPlayAgain} primary={false} className="px-10 mt-auto">
                <RefreshCw className="w-5 h-5 mr-2 inline" /> NEW SESSION
            </FuturisticButton>
        </motion.div>
    );
};