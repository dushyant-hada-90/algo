import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Play, Pause, StepForward, RotateCcw, Settings2, CheckCircle2, Zap } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility for Tailwind ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type MismatchType = '01' | '10'; // 01: s=0, t=1 | 10: s=1, t=0
type MismatchStatus = 'string' | 'bucket' | 'processing' | 'resolved';

interface Mismatch {
  id: number;
  index: number;
  type: MismatchType;
  status: MismatchStatus;
}

interface Step {
  id: number;
  title: string;
  description: string;
  costDelta: number;
  mismatches: Mismatch[];
  highlightIds: number[]; // IDs to highlight during this step
}

// --- Components ---

// Clean White Card
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-xl border border-gray-200 bg-white shadow-sm", className)}>
    {children}
  </div>
);

const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", className)}>
    {children}
  </span>
);

export default function GreedyStringVisualizer() {
  // --- Inputs ---
  const [s, setS] = useState("01000");
  const [t, setT] = useState("10111");
  const [flipCost, setFlipCost] = useState(10);
  const [swapCost, setSwapCost] = useState(2);
  const [crossCost, setCrossCost] = useState(2);

  // --- Simulation State ---
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Logic to Generate Steps (Same as before) ---
  const generateSteps = () => {
    if (s.length !== t.length) {
      alert("Strings must be same length");
      return;
    }

    const newSteps: Step[] = [];
    let currentMismatches: Mismatch[] = [];
    let tempIdCounter = 0;

    // 1. Initial State
    for (let i = 0; i < s.length; i++) {
      if (s[i] !== t[i]) {
        currentMismatches.push({
          id: tempIdCounter++,
          index: i,
          type: s[i] === '0' ? '01' : '10',
          status: 'string',
        });
      }
    }

    // Step 0: Detection
    newSteps.push({
      id: 0,
      title: "Start Analysis",
      description: `Found ${currentMismatches.length} mismatches. Since order doesn't matter, we extract them into pools.`,
      costDelta: 0,
      mismatches: JSON.parse(JSON.stringify(currentMismatches)),
      highlightIds: [],
    });

    // Step 1: Extract to Buckets
    currentMismatches = currentMismatches.map(m => ({ ...m, status: 'bucket' }));
    newSteps.push({
      id: 1,
      title: "Populate Buckets",
      description: "Separating errors into Type 01 (0→1) and Type 10 (1→0) pools.",
      costDelta: 0,
      mismatches: JSON.parse(JSON.stringify(currentMismatches)),
      highlightIds: [],
    });

    // Step 2: Greedy Matching (Opposites)
    let workingMismatches = JSON.parse(JSON.stringify(currentMismatches)) as Mismatch[];
    let bucket01 = workingMismatches.filter(m => m.type === '01' && m.status === 'bucket');
    let bucket10 = workingMismatches.filter(m => m.type === '10' && m.status === 'bucket');

    while (bucket01.length > 0 && bucket10.length > 0) {
      const m1 = bucket01.shift()!;
      const m2 = bucket10.shift()!;
      
      const cost = Math.min(swapCost, 2 * flipCost);
      const method = swapCost < 2 * flipCost ? "Direct Swap" : "Double Flip";

      const processingState = workingMismatches.map(m => 
        (m.id === m1.id || m.id === m2.id) ? { ...m, status: 'processing' as MismatchStatus } : m
      );

      newSteps.push({
        id: newSteps.length,
        title: "Opposite Pair Match",
        description: `Paired a '01' with a '10'. Cheapest option: ${method} (+${cost}).`,
        costDelta: cost,
        mismatches: processingState,
        highlightIds: [m1.id, m2.id],
      });

      workingMismatches = workingMismatches.map(m => 
        (m.id === m1.id || m.id === m2.id) ? { ...m, status: 'resolved' as MismatchStatus } : m
      );
    }

    // Step 3: Same Type Matching
    bucket01 = workingMismatches.filter(m => m.type === '01' && m.status === 'bucket');
    bucket10 = workingMismatches.filter(m => m.type === '10' && m.status === 'bucket');
    const activeBucket = bucket01.length > 0 ? bucket01 : bucket10;
    
    while (activeBucket.length >= 2) {
      const m1 = activeBucket.shift()!;
      const m2 = activeBucket.shift()!;

      const cost = Math.min(crossCost + swapCost, 2 * flipCost);
      const method = (crossCost + swapCost) < (2 * flipCost) ? "Cross-Swap" : "Double Flip";

      const processingState = workingMismatches.map(m => 
        (m.id === m1.id || m.id === m2.id) ? { ...m, status: 'processing' as MismatchStatus } : m
      );

      newSteps.push({
        id: newSteps.length,
        title: "Same Type Pair",
        description: `Two identical errors left. Cheapest option: ${method} (+${cost}).`,
        costDelta: cost,
        mismatches: processingState,
        highlightIds: [m1.id, m2.id],
      });

       workingMismatches = workingMismatches.map(m => 
        (m.id === m1.id || m.id === m2.id) ? { ...m, status: 'resolved' as MismatchStatus } : m
      );
    }

    // Step 4: Leftover
    if (activeBucket.length === 1) {
      const m1 = activeBucket.shift()!;
      const processingState = workingMismatches.map(m => 
        (m.id === m1.id) ? { ...m, status: 'processing' as MismatchStatus } : m
      );
      newSteps.push({
        id: newSteps.length,
        title: "Single Leftover",
        description: `One error remains. Only option is to Flip (+${flipCost}).`,
        costDelta: flipCost,
        mismatches: processingState,
        highlightIds: [m1.id],
      });
       workingMismatches = workingMismatches.map(m => 
        (m.id === m1.id) ? { ...m, status: 'resolved' as MismatchStatus } : m
      );
    }

    // Final Done State
    newSteps.push({
      id: newSteps.length,
      title: "Finished",
      description: "All mismatches resolved. Strings are equal.",
      costDelta: 0,
      mismatches: workingMismatches,
      highlightIds: [],
    });

    setSteps(newSteps);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  // --- Animation Loop ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < steps.length - 1) return prev + 1;
          setIsPlaying(false);
          return prev;
        });
      }, 1500); // Slightly faster pace
    }
    return () => clearInterval(interval);
  }, [isPlaying, steps.length]);

  // Scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentStepIndex]);

  // Initial generation
  useEffect(() => {
    generateSteps();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Derived State for UI ---
  const currentStep = steps[currentStepIndex];
  const currentTotalCost = steps
    .slice(0, currentStepIndex + 1)
    .reduce((acc, step) => acc + step.costDelta, 0);

  const highlightSet = useMemo(() => new Set(currentStep?.highlightIds ?? []), [currentStep]);
  const bucketSnapshot = useMemo(() => {
    if (!currentStep) {
      return {
        bucket01: [] as Mismatch[],
        bucket10: [] as Mismatch[],
        processing: [] as Mismatch[],
      };
    }
    return {
      bucket01: currentStep.mismatches.filter(
        (m) => m.type === '01' && (m.status === 'bucket' || m.status === 'processing')
      ),
      bucket10: currentStep.mismatches.filter(
        (m) => m.type === '10' && (m.status === 'bucket' || m.status === 'processing')
      ),
      processing: currentStep.mismatches.filter((m) => m.status === 'processing'),
    };
  }, [currentStep]);

  const isProcessingStep = bucketSnapshot.processing.length > 0;
  const bucketAActive = bucketSnapshot.processing.some((m) => m.type === '01');
  const bucketBActive = bucketSnapshot.processing.some((m) => m.type === '10');

  // Helper to render Mismatch Nodes (Brighter Colors)
  const MismatchNode = ({ m, highlight }: { m: Mismatch; highlight: boolean }) => (
    <motion.div
      layout
      layoutId={`mismatch-${m.id}`}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{
        scale: highlight ? 1.15 : 1,
        opacity: 1,
        boxShadow: highlight ? "0 0 0 6px rgba(99, 102, 241, 0.35)" : "none",
      }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      exit={{ scale: 0.7, opacity: 0 }}
      className={cn(
        "w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-sm transition-all text-lg",
        m.type === '01' ? "bg-blue-600" : "bg-pink-600",
        highlight ? "ring-2 ring-offset-2 ring-indigo-400" : ""
      )}
    >
      {m.type === '01' ? '0' : '1'}
    </motion.div>
  );

  // --- The Brighter UI ---
  return (
    // Changed background to a clean light gray
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 font-sans antialiased">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Greedy Cost Visualizer</h1>
            <p className="text-gray-500 mt-2 text-lg">Visualize why "Sequence" doesn't matter for LeetCode 3800.</p>
          </div>
          
          {/* Controls - Using cleaner indigo/white buttons */}
          <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className={cn("flex items-center gap-2 px-5 py-2.5 rounded-md font-semibold transition-all shadow-sm", 
                isPlaying ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-indigo-600 text-white hover:bg-indigo-700")}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              {isPlaying ? "Pause" : "Auto Play"}
            </button>
            <button 
               onClick={() => {
                 if(currentStepIndex < steps.length - 1) setCurrentStepIndex(p => p + 1)
               }}
               disabled={currentStepIndex === steps.length - 1 || isPlaying}
               className="p-2.5 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 text-gray-700 bg-white"
               title="Next Step"
            >
              <StepForward size={20} />
            </button>
            <button 
               onClick={() => {
                 generateSteps();
                 setCurrentStepIndex(0);
               }}
               disabled={isPlaying}
               className="p-2.5 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-700 disabled:opacity-40 bg-white"
               title="Reset"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Inputs & Logs (Span 4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Input Card - Pure White background */}
            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-2 bg-indigo-100 rounded-lg">
                    <Settings2 className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="font-bold text-xl text-gray-800">Setup</h2>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">String S (Source)</label>
                    {/* Explicit bg-white inputs */}
                    <input 
                      value={s} 
                      onChange={(e) => setS(e.target.value)}
                      className="w-full p-3 border border-gray-300 bg-white rounded-lg font-mono text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">String T (Target)</label>
                    <input 
                      value={t} 
                      onChange={(e) => setT(e.target.value)}
                      className="w-full p-3 border border-gray-300 bg-white rounded-lg font-mono text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow" 
                    />
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-100">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-3">Operation Costs</label>
                    <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <span className="text-xs text-gray-400 block text-center mb-1">Flip</span>
                        <input type="number" value={flipCost} onChange={e => setFlipCost(Number(e.target.value))} className="w-full p-2 border border-gray-300 bg-white rounded-md text-center font-semibold" />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs text-gray-400 block text-center mb-1">Swap</span>
                        <input type="number" value={swapCost} onChange={e => setSwapCost(Number(e.target.value))} className="w-full p-2 border border-gray-300 bg-white rounded-md text-center font-semibold" />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs text-gray-400 block text-center mb-1">Cross</span>
                        <input type="number" value={crossCost} onChange={e => setCrossCost(Number(e.target.value))} className="w-full p-2 border border-gray-300 bg-white rounded-md text-center font-semibold" />
                    </div>
                    </div>
                </div>

                <button 
                  onClick={() => {
                    generateSteps();
                    setCurrentStepIndex(0);
                  }}
                  className="w-full mt-2 py-3 bg-indigo-600 text-white rounded-lg text-base font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Apply Settings & Restart
                </button>
              </div>
            </Card>

            {/* Explanation Logs - Cleaner brighter look */}
            <Card className="p-0 overflow-hidden flex flex-col h-[400px] shadow-md">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
                 <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                 <h3 className="font-bold text-gray-700">Execution Timeline</h3>
              </div>
              <div ref={scrollRef} className="p-4 overflow-y-auto space-y-4 flex-1 bg-gray-100">
                {steps.slice(0, currentStepIndex + 1).map((step, idx) => {
                   const isActive = idx === currentStepIndex;
                   return (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("text-sm p-4 rounded-xl border shadow-sm transition-all", 
                      isActive 
                        ? "bg-white border-indigo-500 ring-1 ring-indigo-500 shadow-md" 
                        : "bg-white border-gray-200 text-gray-600 opacity-80"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={cn("font-bold text-base", isActive ? "text-gray-900" : "text-gray-700")}>{step.title}</span>
                      {step.costDelta > 0 && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">+{step.costDelta}</Badge>}
                    </div>
                    <p className={cn("leading-relaxed", isActive ? "text-gray-700" : "")}>{step.description}</p>
                  </motion.div>
                )})}
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN: Visualizer Stage (Span 8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            <LayoutGroup id="mismatch-flow">
            {/* Top Stage: The Strings - Pure white background */}
            <Card className="p-8 min-h-[180px] flex flex-col items-center justify-center bg-white relative overflow-hidden shadow-md">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-pink-500"></div>
               <h3 className="absolute top-5 left-6 text-sm font-bold text-gray-400 uppercase tracking-widest">Sequence View (Order Irrelevant)</h3>
               
               {/* Visual representation of strings s and t */}
               <div className="flex gap-3 mt-6">
                 {Array.from(s).map((char, idx) => {
                   const mismatch = currentStep?.mismatches.find((m) => m.index === idx);
                   const showNode = mismatch && mismatch.status === 'string';
                   const isGone = mismatch && mismatch.status !== 'string';
                   const highlight = mismatch ? highlightSet.has(mismatch.id) : false;

                   return (
                     <div key={idx} className="flex flex-col items-center gap-2 w-11 relative">
                        {/* Connector line */}
                        <div className={cn("absolute h-full w-[2px] bg-gray-200 top-0 z-0 transition-colors", !mismatch ? "bg-emerald-200" : "")}></div>

                        <div className={cn("text-xl font-mono font-black z-10 transition-all py-1 px-2 rounded bg-white", isGone ? "text-gray-300" : "text-gray-900")}>{s[idx]}</div>
                        
                        {/* The Node Placeholder */}
                        <div className="h-11 w-11 relative flex items-center justify-center z-20">
                            <AnimatePresence>
                              {showNode && mismatch && (
                                <div className="absolute inset-0">
                                   <MismatchNode m={mismatch} highlight={highlight} />
                                </div>
                              )}
                              {!mismatch && (
                                <motion.div layoutId={`match-${idx}`} className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm" title="Match" />
                              )}
                            </AnimatePresence>
                        </div>
                        
                        <div className={cn("text-xl font-mono font-black z-10 transition-all py-1 px-2 rounded bg-white", isGone ? "text-gray-300" : "text-gray-900")}>{t[idx]}</div>
                     </div>
                   )
                 })}
               </div>
               
               <div className="absolute right-6 top-6 text-right bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                  <div className="text-xs text-gray-500 font-bold uppercase mb-1">Total Cost</div>
                  <div className="text-5xl font-black text-indigo-600 transition-all flex items-baseline gap-1">
                    {currentTotalCost}
                    <span className="text-lg text-gray-400 font-medium">$</span>
                  </div>
               </div>
            </Card>

            <AnimatePresence mode="wait">
              {currentStep && (
                <motion.div
                  key={currentStep.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Current Move</p>
                      <p className="text-lg font-semibold text-gray-900">{currentStep.title}</p>
                    </div>
                    {currentStep.costDelta > 0 && (
                      <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-sm py-1 px-4">
                        +{currentStep.costDelta} cost
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{currentStep.description}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Stage: The Buckets - Brighter backgrounds */}
            <div className="grid grid-cols-2 gap-8">
              
              {/* Bucket 0->1 */}
              <Card className={cn(
                "p-5 min-h-[320px] flex flex-col border-2 transition-colors shadow-md",
                bucketAActive ? "bg-blue-50/70 border-blue-200 ring-1 ring-blue-200" : "bg-white border-dashed border-gray-300"
               )}>
                 <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <div className="w-4 h-4 rounded-full bg-blue-600"></div>
                      </div>
                      <div>
                        <span className="font-black text-base text-gray-800 block">Pool A</span>
                        <span className="text-xs font-medium text-gray-500">Type 01 (Need 1s)</span>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-sm py-1 px-3">
                      count: {currentStep ? currentStep.mismatches.filter(m => m.type === '01' && m.status === 'bucket').length : 0}
                    </Badge>
                 </div>
                 
                 <div className="flex-1 flex flex-wrap content-start gap-3 p-2">
                   <AnimatePresence>
                     {bucketSnapshot.bucket01.map((m) => (
                        <MismatchNode key={m.id} m={m} highlight={highlightSet.has(m.id)} />
                     ))}
                   </AnimatePresence>
                 </div>
              </Card>

              {/* Bucket 1->0 */}
              <Card className={cn(
                "p-5 min-h-[320px] flex flex-col border-2 transition-colors shadow-md",
                bucketBActive ? "bg-pink-50/70 border-pink-200 ring-1 ring-pink-200" : "bg-white border-dashed border-gray-300"
               )}>
                 <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-pink-100 rounded-lg">
                        <div className="w-4 h-4 rounded-full bg-pink-600"></div>
                       </div>
                      <div>
                        <span className="font-black text-base text-gray-800 block">Pool B</span>
                        <span className="text-xs font-medium text-gray-500">Type 10 (Need 0s)</span>
                      </div>
                    </div>
                    <Badge className="bg-pink-100 text-pink-700 border-pink-200 text-sm py-1 px-3">
                      count: {currentStep ? currentStep.mismatches.filter(m => m.type === '10' && m.status === 'bucket').length : 0}
                    </Badge>
                 </div>

                 <div className="flex-1 flex flex-wrap content-start gap-3 p-2">
                   <AnimatePresence>
                     {bucketSnapshot.bucket10.map((m) => (
                        <MismatchNode key={m.id} m={m} highlight={highlightSet.has(m.id)} />
                     ))}
                   </AnimatePresence>
                 </div>
              </Card>
              
            </div>
            </LayoutGroup>
            {/* Processing Zone Overlay */}
            <AnimatePresence>
            {isProcessingStep && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex justify-center -mt-4 relative z-10"
              >
                <div className="bg-white border-2 border-indigo-600 text-indigo-700 px-8 py-3 rounded-full shadow-xl flex items-center gap-3">
                   <Zap className="w-5 h-5 fill-indigo-600 animate-bounce" />
                   <span className="text-base font-bold">Greedy Decision In Progress...</span>
                </div>
              </motion.div>
            )}
            </AnimatePresence>

          </div>
        </div>
      </div>
    </div>
  );
}