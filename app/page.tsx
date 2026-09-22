"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize, Minimize, Volume2, VolumeX, ShieldAlert, CheckCircle, Crosshair, ChevronRight, RefreshCw, Eye, Trophy, AlertCircle, ScanSearch, Settings, Save, Plus, Trash2, Pencil, Medal, Award } from 'lucide-react';

// ==========================================
// 📁 TYPES & INTERFACES
// ==========================================
type RiskZone = {
    id: string;
    name: string;
    aiLabel: string;
    description: string;
    x: number; y: number; width: number; height: number;
    confidence?: number;
};

type Scene = {
    id: string; 
    title: string; 
    originalImage: string; 
    modifiedImage: string; 
    timeLimit: number; 
    risks: RiskZone[];
};

type GameState = 'LOADING' | 'START' | 'REGISTRATION' | 'HOW_TO_PLAY' | 'PLAYING' | 'AI_ANALYZING' | 'AI_RESULT' | 'FINAL_RESULT' | 'LEADERBOARD';

type PlayerScore = { found: string[]; score: number; timeBonus: number; penalty: number; };

type LeaderboardEntry = {
    id?: string; player_name: string; total_score: number; total_risks_found: number; total_risks: number; played_at: string;
};

// URL ของ Google Sheets
const SHEET_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL || "";

// Mock Data สำรอง
const ORIGINAL_SCENES: Scene[] = [{
    id: 'scene-01', title: 'PPE CHALLENGE', originalImage: '/Scene-01-Original.jpg', modifiedImage: '/Scene-01-Modified.jpg', timeLimit: 15,
    risks: [
        { id: 'r1', name: 'Missing Safety Helmet', aiLabel: 'PPE NOT DETECTED', description: 'Worker is missing a helmet.', x: 34, y: 28, width: 7, height: 12, confidence: 97 },
        { id: 'r2', name: 'Missing Safety Glasses', aiLabel: 'PPE NOT DETECTED', description: 'Worker is missing safety glasses.', x: 51, y: 36, width: 4, height: 6, confidence: 93 },
    ]
}];

// ==========================================
// 📁 UI COMPONENTS
// ==========================================
const NeonText = ({ children, className = '', as = 'h1' }: any) => {
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
        className={`relative px-8 py-4 uppercase font-bold tracking-widest overflow-hidden group ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${primary ? 'bg-[#00d2ff]/10 text-[#00d2ff] border border-[#00d2ff]' : 'bg-transparent text-white border border-white/30'} ${className}`}
        style={{ boxShadow: primary && !disabled ? '0 0 15px rgba(0, 210, 255, 0.3), inset 0 0 10px rgba(0, 210, 255, 0.1)' : 'none' }}
    >
        {primary && !disabled && <span className="absolute inset-0 bg-[#00d2ff]/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />}
        <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
        {primary && !disabled && (
            <><span className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#00d2ff]" /><span className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#00d2ff]" /><span className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#00d2ff]" /><span className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#00d2ff]" /></>
        )}
    </motion.button>
);

// ==========================================
// 📁 MAIN APP COMPONENT
// ==========================================
export default function App() {
    const [gameState, setGameState] = useState<GameState>('LOADING');
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [dbScenes, setDbScenes] = useState<Scene[]>([]);
    const [dbLeaderboard, setDbLeaderboard] = useState<LeaderboardEntry[]>([]);
    
    const [playerName, setPlayerName] = useState('');
    const [activeScene, setActiveScene] = useState<Scene | null>(null);
    const [finalScore, setFinalScore] = useState<PlayerScore | null>(null);
    
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const adminClickCount = useRef(0);

    useEffect(() => {
        const checkAdmin = () => { if (typeof window !== 'undefined' && window.location.hash === '#admin') setIsAdminMode(true); else setIsAdminMode(false); };
        checkAdmin(); window.addEventListener('hashchange', checkAdmin);
        return () => window.removeEventListener('hashchange', checkAdmin);
    }, []);

    // อัปเดตฟังก์ชันดึงข้อมูลให้รองรับการดึง Leaderboard จาก Sheets
    const fetchGameData = async () => {
        try {
            if (!SHEET_URL) throw new Error("No URL found in .env.local");

            const fetchUrl = `${SHEET_URL}?t=${Date.now()}`;
            console.log("1. กำลังเชื่อมต่อไปที่:", fetchUrl);
            
            const res = await fetch(fetchUrl, { cache: 'no-store' });
            const text = await res.text();
            
            try {
                const json = JSON.parse(text);
                console.log("2. ข้อมูลที่แปลแล้ว:", json);
                
                if (json.status === 'success' && json.data) {
                    // รองรับโค้ดเก่าและใหม่
                    const scenesData = Array.isArray(json.data) ? json.data : json.data.scenes;
                    const leaderboardData = json.data.leaderboard || [];

                    if (scenesData && scenesData.length > 0) {
                        const parsedScenes = scenesData.map((s: any) => ({
                            ...s, timeLimit: Number(s.timeLimit) || 15,
                            risks: s.risks.map((r: any) => ({ ...r, x: Number(r.x), y: Number(r.y), width: Number(r.width), height: Number(r.height), confidence: Math.floor(Math.random() * 10) + 90 }))
                        }));
                        setDbScenes(parsedScenes);
                    } else {
                        console.warn("⚠️ ไม่มีข้อมูลด่านใน Google Sheets");
                        setDbScenes(ORIGINAL_SCENES);
                    }

                    // อัปเดตกระดานคะแนนจาก Google Sheets โดยตรง!
                    if (leaderboardData.length > 0) {
                        setDbLeaderboard(leaderboardData);
                        localStorage.setItem('aicira_lb', JSON.stringify(leaderboardData));
                    }
                } else {
                    setDbScenes(ORIGINAL_SCENES);
                }
            } catch (jsonErr) {
                console.error("❌ การแปลง JSON ผิดพลาด (อาจเกิดจากสิทธิ์การเข้าถึง Web App):", text);
                setDbScenes(ORIGINAL_SCENES);
            }
        } catch (error) {
            console.error("❌ ดึงข้อมูลไม่สำเร็จ:", error);
            setDbScenes(ORIGINAL_SCENES);
        }
        setGameState('START');
    };

    useEffect(() => { if(!isAdminMode) fetchGameData(); }, [isAdminMode]);

    const playSound = useCallback((type: 'start' | 'correct' | 'wrong' | 'scan' | 'complete' | 'error') => {
        if (!soundEnabled) return;
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            const now = ctx.currentTime;
            
            if (type === 'correct') { osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1); gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.3, now + 0.05); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2); osc.start(now); osc.stop(now + 0.2); } 
            else if (type === 'wrong' || type === 'error') { osc.type = 'triangle'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(150, now + 0.1); gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.2, now + 0.05); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15); osc.start(now); osc.stop(now + 0.15); } 
            else if (type === 'scan') { osc.type = 'square'; osc.frequency.setValueAtTime(400, now); gain.gain.setValueAtTime(0.05, now); for(let i=0; i<10; i++) osc.frequency.setValueAtTime(400 + (i%2*100), now + (i*0.1)); osc.start(now); osc.stop(now + 1); } 
            else if (type === 'start' || type === 'complete') { osc.type = 'triangle'; osc.frequency.setValueAtTime(type === 'start' ? 440 : 880, now); gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5); osc.start(now); osc.stop(now + 0.5); }
        } catch (e) { /* ignore */ }
    }, [soundEnabled]);

    const resetIdleTimer = useCallback(() => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (gameState === 'LEADERBOARD') {
             idleTimerRef.current = setTimeout(() => { 
                fetchGameData(); // โหลดข้อมูลใหม่ก่อนกลับหน้าแรก
                setGameState('REGISTRATION'); 
                setPlayerName(''); 
            }, 30000); 
        }
    }, [gameState]);

    useEffect(() => {
        window.addEventListener('mousemove', resetIdleTimer); window.addEventListener('touchstart', resetIdleTimer); resetIdleTimer();
        return () => { window.removeEventListener('mousemove', resetIdleTimer); window.removeEventListener('touchstart', resetIdleTimer); if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
    }, [resetIdleTimer]);

    const handleRegistrationSubmit = (name: string) => {
        setPlayerName(name);
        const shuffled = [...dbScenes].sort(() => 0.5 - Math.random());
        setActiveScene(shuffled[0]);
        playSound('start');
        setGameState('HOW_TO_PLAY');
    };

    const handleSceneFinish = (scoreData: PlayerScore) => {
        setFinalScore(scoreData);
        setGameState('AI_ANALYZING');
        playSound('scan');
    };

    const calculateAndSaveFinalScore = async () => {
        setGameState('FINAL_RESULT'); playSound('complete');
        if (!activeScene || !finalScore) return;

        const totalScore = Math.max(0, finalScore.score + finalScore.timeBonus - finalScore.penalty);
        
        const newRecord = { player_name: playerName, total_score: totalScore, total_risks_found: finalScore.found.length, total_risks: activeScene.risks.length, played_at: new Date().toISOString() };
        
        // อัปเดตโชว์บนจอก่อนทันที
        let currentLB = [...dbLeaderboard];
        currentLB.push(newRecord);
        currentLB.sort((a, b) => b.total_score - a.total_score);
        currentLB = currentLB.slice(0, 10);
        setDbLeaderboard(currentLB);

        if (SHEET_URL) {
            try {
                await fetch(SHEET_URL, {
                    method: 'POST', mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: "saveScore", ...newRecord })
                });
            } catch(e) { console.error("Sheet save error", e); }
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) { containerRef.current?.requestFullscreen().catch(() => {}); setIsFullscreen(true); } 
        else { document.exitFullscreen(); setIsFullscreen(false); }
    };

    if (isAdminMode) return <AdminDashboard scenes={dbScenes} reloadData={fetchGameData} />;

    return (
        <div ref={containerRef} className="w-full h-screen bg-[#040814] text-white font-sans overflow-hidden select-none touch-none">
            <div className="absolute top-4 right-4 z-50 flex gap-4">
                <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-3 bg-black/40 border border-white/20 rounded-full hover:bg-white/10 backdrop-blur-md">
                    {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6 text-gray-500" />}
                </button>
                <button onClick={toggleFullscreen} className="p-3 bg-black/40 border border-white/20 rounded-full hover:bg-white/10 backdrop-blur-md">
                    {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
                </button>
            </div>

            <AnimatePresence mode="wait">
                {gameState === 'LOADING' && (
                    <motion.div key="loading" className="w-full h-full flex flex-col items-center justify-center bg-[#0a1128]" exit={{opacity:0}}>
                        <RefreshCw className="w-12 h-12 text-[#00d2ff] animate-spin mb-4" />
                        <NeonText className="text-xl tracking-widest animate-pulse">CONNECTING TO CORE...</NeonText>
                    </motion.div>
                )}

                {gameState === 'START' && (
                    <motion.div key="start" className="w-full h-full absolute inset-0 flex flex-col items-center justify-center text-center z-10 space-y-12" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                        <div className="absolute inset-0 bg-[url('https://placehold.co/1920x1080/060b19/00d2ff?text=Industrial+Background')] opacity-20 bg-cover bg-center mix-blend-screen" />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1128]/80 to-[#0a1128] z-0" />
                        <div className="z-10 flex flex-col items-center">
                            <motion.div 
                                initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} 
                                className="mb-4 inline-flex items-center gap-3 px-6 py-2 border border-[#00d2ff]/30 rounded-full bg-[#00d2ff]/10 backdrop-blur-sm cursor-pointer hover:bg-[#00d2ff]/20 transition-colors"
                                onClick={() => {
                                    adminClickCount.current += 1;
                                    if (adminClickCount.current >= 5) { window.location.hash = '#admin'; }
                                }}
                                title="Tap 5 times for Admin Dashboard"
                            >
                                <ScanSearch className="w-5 h-5 text-[#00d2ff]" />
                                <span className="text-[#00d2ff] font-mono tracking-widest text-sm">PHOTO HUNT EDITION</span>
                            </motion.div>
                            <NeonText className="text-7xl md:text-8xl font-black mb-8 tracking-tighter">AI-CiRA CORE</NeonText>
                            <div className="bg-black/40 border border-white/10 p-6 backdrop-blur-md max-w-2xl w-full mx-4 rounded-lg">
                                <p className="text-2xl text-[#00d2ff] font-light italic">"Can You Spot the 5 Differences?"</p>
                            </div>
                        </div>
                        <FuturisticButton onClick={() => setGameState('REGISTRATION')} className="text-2xl px-12 py-6 z-10">
                            ENTER SYSTEM <ChevronRight className="w-8 h-8" />
                        </FuturisticButton>
                        <div className="absolute bottom-8 z-10 text-white/50 text-sm tracking-wider font-mono">Powered by Siam Riken Industrial Co., Ltd.</div>
                    </motion.div>
                )}

                {gameState === 'REGISTRATION' && <RegistrationScreen key="reg" onSubmit={handleRegistrationSubmit} playSound={playSound} />}
                {gameState === 'HOW_TO_PLAY' && (
                    <motion.div key="htp" className="w-full h-full absolute inset-0 flex flex-col items-center justify-center p-8 z-10 bg-[#0a1128]" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                        <NeonText className="text-5xl font-bold mb-16 tracking-widest">HOW TO PLAY</NeonText>
                        <div className="flex flex-col md:flex-row gap-8 max-w-6xl w-full mb-16">
                            {[{ step: '01', title: 'COMPARE', desc: 'Look at the Original and Modified images.', icon: <Eye className="w-12 h-12" /> },
                              { step: '02', title: 'FIND', desc: 'Tap the 5 differences on either image as fast as you can.', icon: <Crosshair className="w-12 h-12" /> },
                              { step: '03', title: 'SCORE', desc: 'Find them all within the time limit for a maximum time bonus.', icon: <Trophy className="w-12 h-12" /> }]
                              .map((item, idx) => (
                                <motion.div key={item.step} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.2 }} className="flex-1 bg-black/40 border border-[#00d2ff]/30 p-8 flex flex-col items-center text-center group">
                                    <div className="text-[#00d2ff] mb-6 opacity-80 group-hover:scale-110 transition-transform">{item.icon}</div>
                                    <h3 className="text-2xl font-bold text-white mb-2"><span className="text-[#00d2ff] text-sm font-mono block mb-2">STEP {item.step}</span>{item.title}</h3>
                                    <p className="text-gray-400 mt-4">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                        <FuturisticButton onClick={() => { setGameState('PLAYING'); playSound('start'); }} className="px-10 py-4">START GAME</FuturisticButton>
                    </motion.div>
                )}
                {gameState === 'PLAYING' && activeScene && <GameScene key={`scene-${activeScene.id}`} scene={activeScene} onFinish={handleSceneFinish} playSound={playSound} />}
                {gameState === 'AI_ANALYZING' && <AIAnalyzingScreen key="ai-analyze" onComplete={() => setGameState('AI_RESULT')} />}
                {gameState === 'AI_RESULT' && activeScene && finalScore && <AIResultScreen key="ai-result" scene={activeScene} scoreData={finalScore} onComplete={calculateAndSaveFinalScore} />}
                {gameState === 'FINAL_RESULT' && activeScene && finalScore && <FinalResultScreen key="final" playerName={playerName} score={finalScore} totalRisks={activeScene.risks.length} onContinue={() => setGameState('LEADERBOARD')} />}
                {gameState === 'LEADERBOARD' && <LeaderboardScreen key="lb" playerName={playerName} leaderboardData={dbLeaderboard} onPlayAgain={() => { fetchGameData(); setGameState('REGISTRATION'); setPlayerName(''); }} />}
            </AnimatePresence>
            <style dangerouslySetInnerHTML={{__html: `@keyframes scan { 0% { top: 0%; } 50% { top: 100%; } 100% { top: 0%; } }`}} />
        </div>
    );
}

// ==========================================
// 📁 GAME SCREENS
// ==========================================

const RegistrationScreen = ({ onSubmit, playSound }: any) => {
    const [name, setName] = useState(''); const [error, setError] = useState('');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (trimmed.length === 0) { setError('Please enter your name.'); playSound('error'); return; }
        if (trimmed.length > 40) { setError('Name is too long.'); playSound('error'); return; }
        onSubmit(trimmed);
    };
    return (
        <motion.div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center z-10 p-4 bg-[#0a1128]" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(0,210,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,210,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-black/60 border border-[#00d2ff]/30 backdrop-blur-md p-10 rounded-xl max-w-lg w-full text-center shadow-[0_0_30px_rgba(0,210,255,0.1)]">
                <ShieldAlert className="w-16 h-16 text-[#00d2ff] mx-auto mb-6" />
                <NeonText className="text-3xl font-bold mb-2">PLAYER REGISTRATION</NeonText>
                <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-8">
                    <div>
                        <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="Please enter your name" className="w-full bg-black/50 border border-[#00d2ff]/50 text-white text-center text-xl p-4 rounded focus:outline-none focus:border-[#00ff88] font-mono" maxLength={40} autoFocus />
                        {error && <p className="text-red-500 text-sm mt-2 font-mono flex justify-center gap-1"><AlertCircle className="w-4 h-4"/>{error}</p>}
                    </div>
                    <FuturisticButton onClick={handleSubmit} className="w-full py-4 text-lg">START GAME</FuturisticButton>
                </form>
            </motion.div>
        </motion.div>
    );
};

const GameScene = ({ scene, onFinish, playSound }: any) => {
    const [timeLeft, setTimeLeft] = useState(scene.timeLimit);
    const [foundRisks, setFoundRisks] = useState<string[]>([]);
    const [tappedCorrectIds, setTappedCorrectIds] = useState<{x: number, y: number, id: string}[]>([]);
    const [missedTaps, setMissedTaps] = useState<{x: number, y: number, id: number}[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const totalMissedCount = useRef(0); 

    useEffect(() => {
        if (timeLeft > 0 && foundRisks.length < scene.risks.length) {
            timerRef.current = setTimeout(() => setTimeLeft((prev:number) => prev - 1), 1000);
        } else if (timeLeft === 0 || foundRisks.length === scene.risks.length) {
            const baseScore = foundRisks.length * 10; 
            const timeBonus = (foundRisks.length === scene.risks.length) ? Math.floor((timeLeft / scene.timeLimit) * 50) : 0; 
            const penalty = totalMissedCount.current * 1.5;
            setTimeout(() => onFinish({ found: foundRisks, score: baseScore, timeBonus: timeBonus, penalty: penalty }), 500);
        }
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [timeLeft, foundRisks.length, scene]);

    const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
        if (timeLeft === 0 || foundRisks.length === scene.risks.length) return;
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;

        let hit = false, alreadyFound = false;
        for (const risk of scene.risks) {
            const pad = 3; 
            if (x >= (risk.x - pad) && x <= (risk.x + risk.width + pad) && y >= (risk.y - pad) && y <= (risk.y + risk.height + pad)) {
                hit = true;
                if (foundRisks.includes(risk.id)) alreadyFound = true;
                else {
                    setFoundRisks((prev:any) => [...prev, risk.id]);
                    setTappedCorrectIds((prev:any) => [...prev, { x, y, id: risk.id }]);
                    playSound('correct');
                }
                break;
            }
        }
        if (!hit && !alreadyFound) {
            playSound('error'); 
            const mid = Date.now();
            totalMissedCount.current += 1;
            setMissedTaps((prev:any) => [...prev, { x, y, id: mid }]);
            setTimeout(() => setMissedTaps((prev:any) => prev.filter((m:any) => m.id !== mid)), 500);
        }
    };

    const renderMarkers = () => (
        <><AnimatePresence>{tappedCorrectIds.map((tap:any) => (
            <motion.div key={tap.id} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${tap.x}%`, top: `${tap.y}%` }}>
                <div className="w-10 h-10 border-2 border-[#00ff88] rounded-full flex items-center justify-center bg-[#00ff88]/20 shadow-[0_0_15px_#00ff88]"><CheckCircle className="text-[#00ff88] w-full h-full" /></div>
            </motion.div>
        ))}</AnimatePresence>
        <AnimatePresence>{missedTaps.map((tap:any) => (
            <motion.div key={tap.id} initial={{ opacity: 0.8, scale: 0.5 }} animate={{ opacity: 0, scale: 2 }} exit={{ opacity: 0 }} className="absolute pointer-events-none z-10 transform -translate-x-1/2 -translate-y-1/2 text-red-500 font-bold text-4xl" style={{ left: `${tap.x}%`, top: `${tap.y}%` }}>×</motion.div>
        ))}</AnimatePresence></>
    );

    return (
        <motion.div className="flex flex-col h-full w-full absolute inset-0 z-10 bg-[#040814]" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <div className="flex justify-between items-center p-4 bg-[#0a1128] border-b border-[#00d2ff]/30 z-20">
                <div className="flex flex-col"><span className="text-[#00d2ff] font-mono text-sm tracking-widest">SPOT THE DIFFERENCE</span><h2 className="text-white text-xl md:text-2xl font-bold tracking-wider">{scene.title}</h2></div>
                <div className="flex items-center gap-4 md:gap-8">
                    <div className="flex flex-col items-center bg-black/40 px-4 py-2 border border-[#00ff88]/30 rounded-lg"><span className="text-[#00ff88] text-[10px] font-mono mb-1">FOUND</span><div className="text-2xl font-mono text-[#00ff88]">{foundRisks.length} <span className="text-gray-500 text-lg">/ {scene.risks.length}</span></div></div>
                    <div className={`flex flex-col items-center px-4 py-2 border rounded-lg ${timeLeft <= 3 ? 'bg-red-900/20 border-red-500 animate-pulse' : 'bg-black/40 border-white/10'}`}><span className="text-gray-400 text-[10px] font-mono mb-1">TIME LEFT</span><div className={`text-2xl font-mono ${timeLeft <= 3 ? 'text-red-500' : 'text-white'}`}>00:{String(timeLeft).padStart(2, '0')}</div></div>
                </div>
            </div>
            <div className="flex-1 flex flex-col md:flex-row gap-2 md:gap-4 p-2 md:p-4 items-center justify-center bg-black overflow-hidden">
                <div className="flex-1 w-full relative flex flex-col items-center">
                    <div className="absolute top-2 left-2 z-20 bg-black/70 px-3 py-1 rounded text-gray-300 font-mono text-xs border border-white/20">ORIGINAL</div>
                    <div className="relative w-full aspect-video border-2 border-white/20 cursor-crosshair overflow-hidden" onMouseDown={handleTap} onTouchStart={handleTap}>
                        <img src={scene.originalImage} alt="Original" className="w-full h-full object-cover select-none pointer-events-none" draggable={false} />
                        {renderMarkers()}
                    </div>
                </div>
                <div className="flex-1 w-full relative flex flex-col items-center">
                    <div className="absolute top-2 right-2 z-20 bg-[#00d2ff]/20 px-3 py-1 rounded text-[#00d2ff] font-mono text-xs border border-[#00d2ff]/50">MODIFIED</div>
                    <div className="relative w-full aspect-video border-2 border-[#00d2ff]/50 cursor-crosshair overflow-hidden" onMouseDown={handleTap} onTouchStart={handleTap}>
                        <img src={scene.modifiedImage} alt="Modified" className="w-full h-full object-cover select-none pointer-events-none" draggable={false} />
                        {renderMarkers()}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const AIAnalyzingScreen = ({ onComplete }: any) => {
    const [progress, setProgress] = useState(0); const [status, setStatus] = useState('INITIALIZING AI');
    useEffect(() => {
        const steps = [{ p: 10, s: 'IMAGE DETECTED' }, { p: 35, s: 'OBJECT ANALYSIS' }, { p: 65, s: 'DIFFERENCE ANALYSIS' }, { p: 90, s: 'MAPPING LOCATIONS' }, { p: 100, s: 'ANALYSIS COMPLETE' }];
        let cur = 0; const int = setInterval(() => { if (cur < steps.length) { setProgress(steps[cur].p); setStatus(steps[cur].s); cur++; } else { clearInterval(int); setTimeout(onComplete, 500); } }, 300);
        return () => clearInterval(int);
    }, [onComplete]);
    return (
        <motion.div className="flex flex-col items-center justify-center h-full w-full bg-[#040814] absolute inset-0 z-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="z-10 flex flex-col items-center w-full max-w-md px-8">
                <ShieldAlert className="text-[#00d2ff] w-24 h-24 mb-8 animate-pulse" />
                <NeonText as="h2" className="text-3xl font-bold mb-2 tracking-widest text-center">AI-CiRA CORE</NeonText>
                <p className="text-[#00d2ff] font-mono text-xl mb-12 animate-pulse">ANALYZING DIFFERENCES...</p>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-4"><motion.div className="h-full bg-[#00d2ff] shadow-[0_0_10px_#00d2ff]" initial={{ width: 0 }} animate={{ width: `${progress}%` }} /></div>
                <div className="flex justify-between w-full font-mono text-xs text-gray-400"><span>{status}</span><span>{progress}%</span></div>
            </div>
        </motion.div>
    );
};

const AIResultScreen = ({ scene, scoreData, onComplete }: any) => {
    const [visible, setVisible] = useState<string[]>([]);
    useEffect(() => {
        let delay = 0; scene.risks.forEach((risk:any) => { setTimeout(() => setVisible((p:any) => [...p, risk.id]), delay); delay += 300; });
        const tid = setTimeout(onComplete, delay + 2500); return () => clearTimeout(tid);
    }, [scene, onComplete]);
    return (
        <motion.div className="flex flex-col h-full w-full bg-black absolute inset-0 z-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute top-4 left-4 z-30 bg-black/70 border border-[#00d2ff] p-4 backdrop-blur-sm rounded"><h3 className="text-[#00d2ff] font-bold tracking-widest mb-1 flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> AI-CiRA CORE DETECTION</h3></div>
            <div className="relative w-full h-full flex items-center justify-center bg-[#0a1128] p-4">
                 <div className="relative w-full max-w-5xl aspect-video border border-[#00d2ff]/30 overflow-hidden">
                    <img src={scene.modifiedImage} alt="Analyzed" className="w-full h-full object-cover opacity-70" />
                    <AnimatePresence>
                        {scene.risks.map((risk:any) => {
                            const isFound = scoreData?.found.includes(risk.id);
                            return visible.includes(risk.id) && (
                                <motion.div key={risk.id} initial={{ opacity: 0, scale: 1.2 }} animate={{ opacity: 1, scale: 1 }} className="absolute border-2 z-20" style={{ left: `${risk.x}%`, top: `${risk.y}%`, width: `${risk.width}%`, height: `${risk.height}%`, borderColor: isFound ? '#00ff88' : '#ff9900' }}>
                                    <div className="absolute bottom-full left-0 mb-1 whitespace-nowrap bg-black/90 border text-[10px] md:text-xs font-mono p-1 flex items-center gap-2" style={{ borderColor: isFound ? '#00ff88' : '#ff9900' }}><span className={isFound ? 'text-[#00ff88]' : 'text-[#ff9900]'}>{risk.name.toUpperCase()}</span></div>
                                    <div className={`w-full h-[1px] absolute opacity-50 ${isFound ? 'bg-[#00ff88]' : 'bg-[#ff9900]'}`} style={{ animation: 'scan 2s linear infinite' }} />
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                 </div>
            </div>
        </motion.div>
    );
};

const FinalResultScreen = ({ playerName, score, totalRisks, onContinue }: any) => {
    const totalFound = score.found.length; 
    const finalScore = Math.max(0, score.score + score.timeBonus - score.penalty);

    return (
        <motion.div className="flex flex-col items-center justify-center h-full w-full absolute inset-0 z-10 p-4 bg-[#0a1128]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="z-10 flex flex-col items-center w-full max-w-4xl">
                <NeonText as="h2" className="text-5xl md:text-6xl font-black mb-4 text-center tracking-widest">CHALLENGE COMPLETE</NeonText>
                <p className="text-xl font-mono text-gray-300 mb-8 uppercase tracking-widest">OPERATOR: <span className="text-white font-bold">{playerName}</span></p>
                
                <div className="bg-black/40 border border-white/10 p-8 rounded-xl flex flex-col items-center justify-center w-full mb-8 relative overflow-hidden">
                    <h3 className="text-gray-400 font-mono mb-2">FINAL SCORE (MAX 100)</h3>
                    <div className="text-7xl font-bold text-white tracking-tighter mb-4">{finalScore.toLocaleString(undefined, {maximumFractionDigits: 1})}</div>
                    <div className="flex flex-wrap gap-4 text-sm font-mono mt-4 border-t border-white/10 pt-4 w-full justify-center">
                        <span className="text-[#00ff88]">FOUND: +{score.score}</span>
                        <span className="text-[#00d2ff]">TIME BONUS: +{score.timeBonus}</span>
                        <span className="text-red-500">PENALTY: -{score.penalty}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-12">
                    <div className="bg-white/5 border border-white/10 p-6 rounded-xl flex flex-col items-center text-center">
                        <h3 className="text-gray-400 font-mono text-sm mb-4">YOUR DETECTION</h3>
                        <div className="text-5xl font-bold text-white mb-2">{totalFound} <span className="text-2xl text-gray-500">/ {totalRisks}</span></div>
                    </div>
                    <div className="bg-[#00d2ff]/5 border border-[#00d2ff]/30 p-6 rounded-xl flex flex-col items-center text-center">
                        <h3 className="text-[#00d2ff] font-mono text-sm mb-4 flex items-center gap-2"><ShieldAlert className="w-4 h-4"/> AI-CiRA CORE</h3>
                        <div className="text-5xl font-bold text-white mb-2">{totalRisks} <span className="text-2xl text-gray-500">/ {totalRisks}</span></div>
                    </div>
                </div>
                <FuturisticButton onClick={onContinue} className="px-16 py-5 text-xl">VIEW LEADERBOARD</FuturisticButton>
            </div>
        </motion.div>
    );
};

const LeaderboardScreen = ({ playerName, leaderboardData, onPlayAgain }: any) => {
    // กรองและเรียงข้อมูลให้มั่นใจว่าถูกต้อง
    const sortedData = [...leaderboardData].sort((a, b) => b.total_score - a.total_score).slice(0, 10);
    const top3 = sortedData.slice(0, 3);
    const others = sortedData.slice(3, 10);

    // ฟังก์ชันช่วยจัดสไตล์ให้เหรียญทอง เงิน ทองแดง
    const getPodiumStyle = (index: number) => {
        if (index === 0) return { color: 'text-yellow-400', border: 'border-yellow-400', bg: 'bg-yellow-400/20', shadow: 'shadow-[0_0_30px_rgba(250,204,21,0.3)]', height: 'h-48 md:h-56', icon: <Trophy className="w-10 h-10 text-yellow-400 mb-2"/> }; // 1st
        if (index === 1) return { color: 'text-gray-300', border: 'border-gray-300', bg: 'bg-gray-300/20', shadow: 'shadow-[0_0_20px_rgba(209,213,219,0.2)]', height: 'h-40 md:h-48', icon: <Medal className="w-8 h-8 text-gray-300 mb-2"/> }; // 2nd
        if (index === 2) return { color: 'text-amber-600', border: 'border-amber-600', bg: 'bg-amber-600/20', shadow: 'shadow-[0_0_20px_rgba(217,119,6,0.2)]', height: 'h-32 md:h-40', icon: <Award className="w-8 h-8 text-amber-600 mb-2"/> }; // 3rd
        return { color: '', border: '', bg: '', shadow: '', height: '', icon: null };
    };

    // จัดเรียงลำดับการแสดงผล Podium ซ้าย(2) กลาง(1) ขวา(3)
    const podiumDisplayOrder = [
        { data: top3[1], originalIndex: 1 }, 
        { data: top3[0], originalIndex: 0 }, 
        { data: top3[2], originalIndex: 2 }
    ];

    return (
        <motion.div className="flex flex-col items-center justify-start h-full w-full absolute inset-0 z-10 pt-12 pb-8 px-4 bg-[#0a1128] overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <NeonText as="h2" className="text-4xl font-black mb-12 tracking-widest text-center">TOP 10 DETECTIVES</NeonText>
            
            {/* --- ส่วนที่ 1: Podium Top 3 --- */}
            {top3.length > 0 && (
                <div className="flex items-end justify-center gap-2 md:gap-6 w-full max-w-3xl mb-12 px-2">
                    {podiumDisplayOrder.map((item, idx) => {
                        if (!item.data) return <div key={idx} className="flex-1" />; // ถ้าคนเล่นไม่ถึง 3 คน ให้เว้นช่องว่างไว้
                        const style = getPodiumStyle(item.originalIndex);
                        const isCurrentPlayer = item.data.player_name === playerName;
                        
                        return (
                            <motion.div 
                                key={idx}
                                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: item.originalIndex * 0.2 }}
                                className={`flex-1 flex flex-col items-center justify-end rounded-t-xl border-t-4 border-l border-r p-4 relative ${style.border} ${style.bg} ${style.shadow} ${style.height} ${isCurrentPlayer ? 'animate-pulse' : ''}`}
                            >
                                {style.icon}
                                <span className={`text-2xl md:text-4xl font-black mb-1 ${style.color}`}>{item.data.total_score.toLocaleString(undefined, {maximumFractionDigits: 1})}</span>
                                <span className={`font-bold text-center text-sm md:text-base truncate w-full ${isCurrentPlayer ? 'text-white' : 'text-gray-200'}`} title={item.data.player_name}>
                                    {item.data.player_name}
                                </span>
                                <div className={`absolute -bottom-6 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-black border-2 ${style.border} ${style.color}`}>
                                    {item.originalIndex + 1}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* --- ส่วนที่ 2: อันดับที่ 4 - 10 --- */}
            {others.length > 0 && (
                <div className="w-full max-w-2xl bg-black/40 border border-white/10 rounded-xl p-6 mb-12 mt-6">
                    {others.map((entry:any, idx:number) => (
                        <div key={idx} className={`flex justify-between items-center py-3 border-b border-white/5 last:border-0 ${entry.player_name === playerName ? 'bg-white/10 rounded px-2 -mx-2' : ''}`}>
                            <div className="flex items-center gap-4">
                                <span className="text-gray-500 font-mono w-6">#{idx + 4}</span>
                                <span className={`font-bold ${entry.player_name === playerName ? 'text-white' : 'text-gray-300'}`}>{entry.player_name}</span>
                            </div>
                            <span className="font-mono text-[#00d2ff]">{entry.total_score.toLocaleString(undefined, {maximumFractionDigits: 1})}</span>
                        </div>
                    ))}
                </div>
            )}

            <FuturisticButton onClick={onPlayAgain} primary={false} className="px-10 mt-auto shrink-0">
                <RefreshCw className="w-5 h-5 mr-2 inline" /> NEXT PLAYER
            </FuturisticButton>
        </motion.div>
    );
};

// ==========================================
// 📁 ADMIN DASHBOARD (ซ่อนไว้สำหรับเจ้าหน้าที่)
// ==========================================
const AdminDashboard = ({ scenes, reloadData }: any) => {
    const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [tempBox, setTempBox] = useState<any>(null);
    const [statusMsg, setStatusMsg] = useState("");

    const handleSceneSelect = (s: Scene) => { setSelectedScene(JSON.parse(JSON.stringify(s))); };

    const createNewScene = () => {
        setSelectedScene({ id: `scene-${Date.now()}`, title: "New Scene", originalImage: "/Scene-01-Original.jpg", modifiedImage: "/Scene-01-Modified.jpg", timeLimit: 15, risks: [] });
    };

    const onMouseDown = (e: React.MouseEvent) => {
        if (!selectedScene) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setStartPos({ x, y }); setIsDrawing(true); setTempBox({ x, y, width: 0, height: 0 });
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const curX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const curY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        setTempBox({ x: Math.min(startPos.x, curX), y: Math.min(startPos.y, curY), width: Math.abs(curX - startPos.x), height: Math.abs(curY - startPos.y) });
    };

    const onMouseUp = () => {
        if (isDrawing && tempBox && tempBox.width > 2 && tempBox.height > 2) {
            const newRisk = { id: `r-${Date.now()}`, name: "New Risk", aiLabel: "LABEL", description: "Desc", ...tempBox };
            setSelectedScene((prev:any) => ({ ...prev, risks: [...prev.risks, newRisk] }));
        }
        setIsDrawing(false); setTempBox(null);
    };

    const removeRisk = (id: string) => { setSelectedScene((prev:any) => ({ ...prev, risks: prev.risks.filter((r:any) => r.id !== id) })); };

    const saveToSheets = async () => {
        if (!SHEET_URL) { alert("ไม่มี URL Google Sheets ในระบบ (.env.local)"); return; }
        setStatusMsg("กำลังบันทึกข้อมูล... (รอสักครู่)");
        try {
            await fetch(SHEET_URL, { 
                method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ action: "saveSceneConfig", scene: selectedScene }) 
            });
            setStatusMsg("ส่งคำสั่งบันทึกแล้ว! (รีเฟรชหน้าเว็บเพื่อดูผลลัพธ์)");
            reloadData(); 
            setTimeout(() => setStatusMsg(""), 4000);
        } catch (e) {
            console.error("Save Error:", e);
            setStatusMsg("เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย");
        }
    };

    return (
        <div className="w-full min-h-screen bg-gray-900 text-white p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                <h1 className="text-3xl font-bold flex items-center gap-2"><Settings className="text-[#00d2ff]"/> AI-CiRA CORE Admin Mode</h1>
                <a href="/" className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 text-sm">กลับไปหน้าเกม</a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="bg-gray-800 p-4 rounded-lg">
                    <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">จัดการด่าน (Scenes)</h2>
                    <ul className="space-y-2 mb-4">
                        {scenes.map((s:any) => (
                            <li key={s.id} onClick={() => handleSceneSelect(s)} className={`p-3 rounded cursor-pointer flex justify-between items-center ${selectedScene?.id === s.id ? 'bg-[#00d2ff] text-black font-bold' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                <span>{s.title}</span><span className="text-xs opacity-70">{s.risks.length} จุด</span>
                            </li>
                        ))}
                    </ul>
                    <button onClick={createNewScene} className="w-full py-2 bg-green-600 hover:bg-green-500 rounded flex items-center justify-center gap-2"><Plus className="w-4 h-4"/> สร้างด่านใหม่</button>
                </div>

                {selectedScene ? (
                    <div className="col-span-1 lg:col-span-3 space-y-6">
                        <div className="bg-gray-800 p-4 rounded-lg grid grid-cols-2 gap-4">
                            <div><label className="text-xs text-gray-400">Scene ID</label><input type="text" value={selectedScene.id} readOnly className="w-full bg-gray-900 p-2 rounded text-sm text-gray-500" /></div>
                            <div><label className="text-xs text-gray-400">ชื่อด่าน (Title)</label><input type="text" value={selectedScene.title} onChange={e => setSelectedScene({...selectedScene, title: e.target.value})} className="w-full bg-gray-700 p-2 rounded text-sm" /></div>
                            <div><label className="text-xs text-gray-400">รูปภาพ Original (ไฟล์ใน /public)</label><input type="text" value={selectedScene.originalImage} onChange={e => setSelectedScene({...selectedScene, originalImage: e.target.value})} className="w-full bg-gray-700 p-2 rounded text-sm" /></div>
                            <div><label className="text-xs text-gray-400">รูปภาพ Modified (รูปมีจุดผิด)</label><input type="text" value={selectedScene.modifiedImage} onChange={e => setSelectedScene({...selectedScene, modifiedImage: e.target.value})} className="w-full bg-gray-700 p-2 rounded text-sm" /></div>
                        </div>

                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="font-bold mb-2 text-[#00d2ff]">Visual Editor (ใช้เมาส์ลากคลุมจุดเสี่ยงบนภาพ)</h3>
                            <div className="relative w-full aspect-video border-2 border-gray-600 cursor-crosshair select-none" onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
                                <img src={selectedScene.modifiedImage} alt="Editor" className="w-full h-full object-cover pointer-events-none" />
                                {selectedScene.risks.map((r:any) => (
                                    <div key={r.id} className="absolute border-2 border-[#00ff88] bg-[#00ff88]/20 flex items-center justify-center pointer-events-none" style={{ left:`${r.x}%`, top:`${r.y}%`, width:`${r.width}%`, height:`${r.height}%` }}>
                                        <span className="bg-black/80 px-1 text-[10px] text-white absolute -bottom-5">{r.name}</span>
                                    </div>
                                ))}
                                {isDrawing && tempBox && (
                                    <div className="absolute border-2 border-dashed border-red-500 bg-red-500/20 pointer-events-none" style={{ left:`${tempBox.x}%`, top:`${tempBox.y}%`, width:`${tempBox.width}%`, height:`${tempBox.height}%` }} />
                                )}
                            </div>
                        </div>

                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="font-bold mb-4 border-b border-gray-700 pb-2">รายละเอียดจุดเสี่ยง ({selectedScene.risks.length} จุด)</h3>
                            <div className="space-y-3">
                                {selectedScene.risks.map((r:any, i:number) => (
                                    <div key={r.id} className="grid grid-cols-12 gap-2 bg-gray-700 p-2 rounded items-center">
                                        <div className="col-span-3"><input type="text" value={r.name} onChange={e => { const newR = [...selectedScene.risks]; newR[i].name = e.target.value; setSelectedScene({...selectedScene, risks: newR}); }} className="w-full bg-gray-900 p-1 text-sm rounded" placeholder="ชื่อ (เช่น ไม่ใส่หมวก)" /></div>
                                        <div className="col-span-3"><input type="text" value={r.aiLabel} onChange={e => { const newR = [...selectedScene.risks]; newR[i].aiLabel = e.target.value; setSelectedScene({...selectedScene, risks: newR}); }} className="w-full bg-gray-900 p-1 text-sm rounded" placeholder="AI Label" /></div>
                                        <div className="col-span-5"><input type="text" value={r.description} onChange={e => { const newR = [...selectedScene.risks]; newR[i].description = e.target.value; setSelectedScene({...selectedScene, risks: newR}); }} className="w-full bg-gray-900 p-1 text-sm rounded" placeholder="คำอธิบายเพิ่มเติม" /></div>
                                        <div className="col-span-1 text-right"><button onClick={() => removeRisk(r.id)} className="text-red-500 hover:text-red-400"><Trash2 className="w-5 h-5 mx-auto"/></button></div>
                                    </div>
                                ))}
                                {selectedScene.risks.length === 0 && <p className="text-gray-500 text-center py-4">ยังไม่มีพิกัด ลองใช้เมาส์ลากบนรูปภาพด้านบนดูสิครับ</p>}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button onClick={saveToSheets} className="px-8 py-3 bg-[#00d2ff] hover:bg-[#00a8cc] text-black font-bold rounded flex items-center gap-2"><Save className="w-5 h-5"/> บันทึกลง Google Sheets</button>
                            {statusMsg && <span className="text-green-400 font-bold">{statusMsg}</span>}
                        </div>
                    </div>
                ) : (
                    <div className="col-span-1 lg:col-span-3 flex flex-col items-center justify-center bg-gray-800 rounded-lg min-h-[50vh] text-gray-500">
                        <Pencil className="w-16 h-16 mb-4 opacity-50"/>
                        <p>เลือกด่านจากเมนูด้านซ้ายเพื่อแก้ไข หรือสร้างด่านใหม่</p>
                    </div>
                )}
            </div>
        </div>
    );
};