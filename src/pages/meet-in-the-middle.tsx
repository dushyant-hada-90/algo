import  { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, RotateCcw,ArrowDown, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from "sonner"; // 1. Import toast
import { Toaster } from "@/components/ui/sonner";
// --- Types ---
type Phase = 'input' | 'split' | 'generate-left' | 'generate-right' | 'matching' | 'finished';

interface Step {
    phase: Phase;
    description: string;
    leftPart: number[];
    rightPart: number[];
    leftSums: Record<number, number[]>; // k -> list of sums
    rightSums: Record<number, number[]>; // k -> list of sums

    // Highlighting state
    activeLeftIndex?: number;  // Index in leftPart being processed (during generation)
    activeRightIndex?: number; // Index in rightPart being processed

    // Matching state
    currentK?: number;         // Current subset size we are matching
    currentLeftSum?: number;   // The specific sum from left we are trying to match
    targetRight?: number;      // The ideal number we want from right
    matchedRightValues?: number[]; // The closest values found in right

    globalMinDiff: number;
    bestTotalSum: number;
}

const DEFAULT_ARRAY = [3, 9, 7, 3];

export default function MeetInTheMiddleVisualizer() {
    // --- State ---
    const [inputStr, setInputStr] = useState(DEFAULT_ARRAY.join(', '));
    const [nums, setNums] = useState<number[]>(DEFAULT_ARRAY);

    const [steps, setSteps] = useState<Step[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(800);

    const timerRef = useRef<number | null>(null);

    const validateArray = () => {
        // Re-parse the current input string to check its length
        const currentArr = inputStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));

        if (currentArr.length === 0) {
            toast.error("Array cannot be empty");
            return false;
        }

        if (currentArr.length % 2 !== 0) {
            toast.error("Invalid Array Length", {
                description: `The array has ${currentArr.length} items. Partitioning requires an EVEN number of elements.`,
            });
            return false;
        }
        return true;
    };

    // --- Algorithm Logic (Step Generator) ---
    const generateSteps = (arr: number[]) => {
        const newSteps: Step[] = [];
        const n = Math.floor(arr.length / 2);
        const totalSum = arr.reduce((a, b) => a + b, 0);
        const halfSum = totalSum / 2;

        // Initial State
        let currentStep: Step = {
            phase: 'input',
            description: 'Ready to start. Total Sum = ' + totalSum + '. Ideal subset sum = ' + halfSum,
            leftPart: [],
            rightPart: [],
            leftSums: {},
            rightSums: {},
            globalMinDiff: Infinity,
            bestTotalSum: 0
        };
        newSteps.push({ ...currentStep });

        // 1. Split Phase
        const leftPart = arr.slice(0, n);
        const rightPart = arr.slice(n);

        currentStep = {
            ...currentStep,
            phase: 'split',
            description: `Split array into Left [${leftPart.join(', ')}] and Right [${rightPart.join(', ')}]`,
            leftPart,
            rightPart
        };
        newSteps.push({ ...currentStep });

        // Helper to generate sums and log steps
        const getSumsWithSteps = (part: number[], isLeft: boolean) => {
            const sums: Record<number, number[]> = {};
            // Initialize lists
            for (let k = 0; k <= part.length; k++) sums[k] = [];

            // We will use simple recursion to generate and log
            const backtrack = (idx: number, currentCount: number, currentSum: number) => {
                if (idx === part.length) {
                    sums[currentCount].push(currentSum);
                    // Log the update
                    if (isLeft) {
                        currentStep.leftSums = JSON.parse(JSON.stringify(sums));
                        currentStep.phase = 'generate-left';
                        currentStep.description = `Generating Left subsets: Found sum ${currentSum} (size ${currentCount})`;
                    } else {
                        currentStep.rightSums = JSON.parse(JSON.stringify(sums));
                        currentStep.phase = 'generate-right';
                        currentStep.description = `Generating Right subsets: Found sum ${currentSum} (size ${currentCount})`;
                    }
                    newSteps.push({ ...currentStep });
                    return;
                }

                // Include
                backtrack(idx + 1, currentCount + 1, currentSum + part[idx]);
                // Exclude
                backtrack(idx + 1, currentCount, currentSum);
            };

            backtrack(0, 0, 0);
            return sums;
        };

        // 2. Generate Left
        const leftSums = getSumsWithSteps(leftPart, true);

        // 3. Generate Right (and sort)
        const rightSums = getSumsWithSteps(rightPart, false);

        // Sort logic step
        for (let k = 0; k <= n; k++) {
            rightSums[k].sort((a, b) => a - b);
        }
        currentStep.rightSums = rightSums;
        currentStep.description = "Sorted all Right sums for Binary Search.";
        newSteps.push({ ...currentStep });

        // 4. Matching Phase (Meet-in-the-Middle)
        currentStep.phase = 'matching';
        let minDiff = Infinity;

        for (let k = 0; k <= n; k++) {
            const leftList = leftSums[k];
            const rightList = rightSums[n - k]; // Must pick n-k from right

            if (!rightList || rightList.length === 0) continue;

            for (const sLeft of leftList) {
                const target = halfSum - sLeft;

                // Binary Search Simulation
                let low = 0, high = rightList.length - 1;
                let idx = rightList.length; // bisect_left result

                // Find insertion point
                while (low <= high) {
                    const mid = Math.floor((low + high) / 2);
                    if (rightList[mid] >= target) {
                        idx = mid;
                        high = mid - 1;
                    } else {
                        low = mid + 1;
                    }
                }

                // Candidates: idx and idx-1
                const candidates = [];
                if (idx < rightList.length) candidates.push(rightList[idx]);
                if (idx > 0) candidates.push(rightList[idx - 1]);

                // Evaluate candidates
                for (const sRight of candidates) {
                    const totalSubsetSum = sLeft + sRight;
                    const diff = Math.abs(totalSum - 2 * totalSubsetSum);

                    if (diff < minDiff) {
                        minDiff = diff;
                        currentStep.globalMinDiff = minDiff;
                        currentStep.bestTotalSum = totalSubsetSum;
                    }

                    currentStep = {
                        ...currentStep,
                        phase: 'matching',
                        currentK: k,
                        currentLeftSum: sLeft,
                        targetRight: Math.round(target * 10) / 10, // clean display
                        matchedRightValues: candidates,
                        description: `Left (size ${k}) Sum: ${sLeft}. Need ~${Math.round(target)}. Checking Right (size ${n - k}): [${candidates.join(', ')}]. Diff: ${diff}`,
                        globalMinDiff: minDiff
                    };
                    newSteps.push({ ...currentStep });

                    if (minDiff === 0) break; // Optimization
                }
                if (minDiff === 0) break;
            }
            if (minDiff === 0) break;
        }

        // Final Step
        currentStep = {
            ...currentStep,
            phase: 'finished',
            description: `Algorithm Finished! Minimum Absolute Difference is ${minDiff}.`,
            currentK: undefined,
            currentLeftSum: undefined,
            targetRight: undefined,
            matchedRightValues: undefined
        };
        newSteps.push({ ...currentStep });

        setSteps(newSteps);
        setCurrentStepIndex(0);
    };

    // --- Effects ---
    useEffect(() => {
        // Parse input and regenerate steps
        const arr = inputStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (arr.length > 0 && arr.length % 2 === 0) {
            setNums(arr);
            generateSteps(arr);
        }
    }, [inputStr]);

    useEffect(() => {
        if (isPlaying) {
            // Explicitly use window.setInterval to return a number
            timerRef.current = window.setInterval(() => {
                setCurrentStepIndex(prev => {
                    if (prev >= steps.length - 1) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, playbackSpeed);
        } else if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
        return () => {
            if (timerRef.current) window.clearInterval(timerRef.current);
        };
    }, [isPlaying, steps.length, playbackSpeed]);

    const step = steps[currentStepIndex];

    // --- Handlers ---
    // Replace simple handlers with validation-wrapped versions
    const handlePlay = () => {
        if (validateArray()) {
            setIsPlaying(prev => !prev);
        }
    };

    const handleNext = () => {
        if (validateArray()) {
            setCurrentStepIndex(p => Math.min(steps.length - 1, p + 1));
        }
    };
    const handlePrev = () => {
        if (validateArray()) {
            setCurrentStepIndex(p => Math.max(0, p - 1));
        }
    };
    const handleReset = () => { setIsPlaying(false); setCurrentStepIndex(0); };

    if (!step) return <div>Loading...</div>;

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6 font-sans text-slate-800">

            {/* HEADER & CONTROLS */}
            <Card className="bg-white shadow-sm border-slate-200">
                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <CardTitle className="text-2xl font-bold text-slate-900">
                                Meet-in-the-Middle Visualizer
                            </CardTitle>
                            <p className="text-slate-500 text-sm mt-1">
                                LeetCode 2035: Partition Array Into Two Arrays to Minimize Sum Difference
                            </p>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <span className="text-sm font-medium whitespace-nowrap">Array (Even Length):</span>
                            <Input
                                value={inputStr}
                                onChange={(e) => setInputStr(e.target.value)}
                                className="font-mono"
                            />
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={handleReset}><RotateCcw size={16} /></Button>
                            <Button variant="outline" size="icon" onClick={handlePrev}><SkipBack size={16} /></Button>
                            <Button
                                variant={isPlaying ? "secondary" : "default"}
                                onClick={handlePlay}
                                className="w-24"
                            >
                                {isPlaying ? <><Pause size={16} className="mr-2" /> Pause</> : <><Play size={16} className="mr-2" /> Play</>}
                            </Button>
                            <Button variant="outline" size="icon" onClick={handleNext}><SkipForward size={16} /></Button>
                        </div>

                        <div className="flex items-center gap-4 flex-1 min-w-[240px] bg-slate-100/50 px-4 py-2 rounded-full border border-slate-200">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Speed</span>
                            <Slider
                                value={[2000 - playbackSpeed]}
                                max={1900}
                                min={100}
                                step={100}
                                onValueChange={(v: number[]) => setPlaybackSpeed(2000 - v[0])}
                                className="flex-1 cursor-pointer"
                            />
                            <span className="text-[10px] font-mono text-slate-400 w-12 text-right">
                                {playbackSpeed}ms
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 min-h-[60px] flex items-center">
                        <p className="text-slate-700 font-medium">
                            <span className="text-blue-600 font-bold uppercase text-xs mr-2 tracking-wider">
                                {step.phase.replace('-', ' ')}
                            </span>
                            {step.description}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* MAIN VISUALIZATION AREA */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* LEFT COLUMN: Left Part & Generated Sums */}
                <div className="md:col-span-4 space-y-4">
                    <Card className={`transition-all duration-300 ${step.phase.includes('left') ? 'ring-2 ring-blue-400' : ''}`}>
                        <CardHeader className="py-3 bg-slate-50 border-b">
                            <CardTitle className="text-sm uppercase text-slate-500">Left Half</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="flex gap-2 flex-wrap mb-4">
                                {step.leftPart.length > 0 ? step.leftPart.map((n, i) => (
                                    <div key={i} className="w-10 h-10 bg-white border-2 border-slate-200 rounded-lg flex items-center justify-center font-bold shadow-sm">
                                        {n}
                                    </div>
                                )) : <span className="text-slate-400 italic">Waiting for split...</span>}
                            </div>

                            {/* Left Sums Table */}
                            <div className="space-y-2">
                                {Object.entries(step.leftSums).map(([k, sums]) => (
                                    <div key={k} className={`text-xs p-2 rounded ${step.currentK === Number(k) ? 'bg-blue-100 border border-blue-200' : 'bg-slate-100'}`}>
                                        <div className="font-semibold mb-1 text-slate-600">Size k = {k}</div>
                                        <div className="flex flex-wrap gap-1">
                                            {sums.map((s, i) => (
                                                <span key={i} className={`px-1.5 py-0.5 rounded ${step.currentLeftSum === s && step.currentK === Number(k) ? 'bg-blue-600 text-white scale-110' : 'bg-white text-slate-600'} transition-all`}>
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* MIDDLE COLUMN: Matching Logic / Global Stats */}
                <div className="md:col-span-4 flex flex-col gap-4">
                    {/* Global Stats */}
                    <Card className="bg-slate-900 text-white border-none shadow-lg">
                        <CardContent className="pt-6 text-center space-y-4">
                            <div>
                                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Global Min Difference</div>
                                <div className="text-4xl font-bold tracking-tight">
                                    {step.globalMinDiff === Infinity ? '∞' : step.globalMinDiff}
                                </div>
                            </div>
                            <div className="flex justify-between text-xs text-slate-400 border-t border-slate-800 pt-4">
                                <div>Target Sum: <span className="text-white">{step.bestTotalSum > 0 ? (nums.reduce((a, b) => a + b, 0) / 2).toFixed(1) : '-'}</span></div>
                                <div>Best Subset Sum: <span className="text-white">{step.bestTotalSum || '-'}</span></div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active Matching View */}
                    {step.phase === 'matching' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 shadow-sm"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <Badge variant="outline" className="bg-white">Match Check</Badge>
                                <Search size={16} className="text-yellow-600" />
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span>Selected Left Sum:</span>
                                    <span className="font-bold text-lg">{step.currentLeftSum}</span>
                                </div>

                                <div className="flex justify-center">
                                    <ArrowDown size={20} className="text-slate-300" />
                                </div>

                                <div className="bg-white p-3 rounded border text-center">
                                    <div className="text-xs text-slate-500 mb-1">Target in Right Half</div>
                                    <div className="font-mono font-bold text-lg text-blue-600">
                                        {step.targetRight}
                                    </div>
                                    <div className="text-[10px] text-slate-400">TotalSum/2 - LeftSum</div>
                                </div>

                                <div className="flex justify-center">
                                    <ArrowDown size={20} className="text-slate-300" />
                                </div>

                                <div className="text-center text-sm">
                                    Found closest in Right[n-{step.currentK}]: <br />
                                    <span className="font-bold text-lg bg-green-100 px-2 rounded text-green-800">
                                        {step.matchedRightValues?.join(' or ')}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* RIGHT COLUMN: Right Part & Generated Sums */}
                <div className="md:col-span-4 space-y-4">
                    <Card className={`transition-all duration-300 ${step.phase.includes('right') ? 'ring-2 ring-green-400' : ''}`}>
                        <CardHeader className="py-3 bg-slate-50 border-b">
                            <CardTitle className="text-sm uppercase text-slate-500">Right Half</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="flex gap-2 flex-wrap mb-4">
                                {step.rightPart.length > 0 ? step.rightPart.map((n, i) => (
                                    <div key={i} className="w-10 h-10 bg-white border-2 border-slate-200 rounded-lg flex items-center justify-center font-bold shadow-sm">
                                        {n}
                                    </div>
                                )) : <span className="text-slate-400 italic">Waiting...</span>}
                            </div>

                            {/* Right Sums Table */}
                            <div className="space-y-2">
                                {Object.entries(step.rightSums).map(([k, sums]) => {
                                    const n = nums.length / 2;
                                    const isTargetGroup = step.phase === 'matching' && step.currentK !== undefined && Number(k) === (n - step.currentK);

                                    return (
                                        <div key={k} className={`text-xs p-2 rounded transition-colors duration-300 ${isTargetGroup ? 'bg-green-100 border border-green-300 shadow-md' : 'bg-slate-100'}`}>
                                            <div className="font-semibold mb-1 text-slate-600 flex justify-between">
                                                <span>Size n-k = {k}</span>
                                                {isTargetGroup && <Badge className="h-4 text-[9px] bg-green-600">Target Group</Badge>}
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {sums.map((s, i) => {
                                                    const isMatch = step.matchedRightValues?.includes(s) && isTargetGroup;
                                                    return (
                                                        <span key={i} className={`px-1.5 py-0.5 rounded transition-all ${isMatch ? 'bg-green-600 text-white scale-110 font-bold' : 'bg-white text-slate-600'}`}>
                                                            {s}
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>

            {/* Add Toaster for toast notifications */}
            <Toaster position="top-center" richColors />
        </div>
    );
}