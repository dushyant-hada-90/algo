import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

type ActionType = 'start' | 'checking' | 'found_negative_row' | 'moving_right' | 'moving_up' | 'finished';

interface StepState {
  rowPointer: number;
  colPointer: number;
  currentCount: number;
  highlightedCells: { r: number; c: number }[];
  actionType: ActionType;
  description: string;
}

const cellVariants: Variants = {
  default: { backgroundColor: '#ffffff', color: '#64748b', scale: 1, borderColor: '#e2e8f0' },
  'static-negative': { backgroundColor: '#f8fafc', color: '#ef4444', scale: 1, borderColor: '#e2e8f0' },
  pointer: { backgroundColor: '#fef9c3', color: '#ca8a04', scale: 1.05, borderColor: '#eab308', zIndex: 10 },
  checking: { backgroundColor: '#bfdbfe', color: '#1d4ed8', scale: 1.1, borderColor: '#3b82f6', zIndex: 10 },
  'counted-negative': { 
    backgroundColor: '#fee2e2', 
    color: '#b91c1c', 
    scale: 1, 
    borderColor: '#ef4444',
    transition: { type: "spring" as const, stiffness: 400, damping: 25 } 
  },
};

const CountNegativesVisualizer = () => {
  const [inputValue, setInputValue] = useState("[[4,3,2,-1],[3,2,1,-1],[1,1,-1,-2],[-1,-1,-2,-3]]");
  const [grid, setGrid] = useState([[4, 3, 2, -1], [3, 2, 1, -1], [1, 1, -1, -2], [-1, -1, -2, -3]]);
  const [error, setError] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const n = grid.length;
  const m = grid[0].length;

  // Algorithm Steps Calculation
  const steps = useMemo(() => {
    const _steps: StepState[] = [];
    let r = n - 1; let c = 0; let count = 0;

    _steps.push({ rowPointer: r, colPointer: c, currentCount: 0, highlightedCells: [], actionType: 'start', description: 'Algo Start: Starting at bottom-left.' });

    while (r >= 0 && c < m) {
      _steps.push({ rowPointer: r, colPointer: c, currentCount: count, highlightedCells: [{ r, c }], actionType: 'checking', description: `Checking [${r},${c}]: Value ${grid[r][c]}` });

      if (grid[r][c] < 0) {
        const rowCells = [];
        for (let k = c; k < m; k++) rowCells.push({ r, c: k });
        count += (m - c);
        _steps.push({ rowPointer: r, colPointer: c, currentCount: count, highlightedCells: rowCells, actionType: 'found_negative_row', description: `Found Negative! All ${m - c} elements to the right are negative.` });
        r--;
      } else {
        c++;
        if (c < m) _steps.push({ rowPointer: r, colPointer: c, currentCount: count, highlightedCells: [{ r, c }], actionType: 'moving_right', description: 'Positive found. Moving right to find boundary.' });
      }
    }
    _steps.push({ rowPointer: -1, colPointer: -1, currentCount: count, highlightedCells: [], actionType: 'finished', description: `Finished! Found ${count} negative numbers.` });
    return _steps;
  }, [grid, n, m]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isPlaying && currentStepIndex < steps.length - 1) {
      timer = setTimeout(() => setCurrentStepIndex(i => i + 1), 800);
    } else { setIsPlaying(false); }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, steps.length]);

  // Scroll log to bottom
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [currentStepIndex]);

  const handleInputChange = () => {
    try {
      const parsed = JSON.parse(inputValue);
      if (!Array.isArray(parsed) || !Array.isArray(parsed[0])) throw new Error("Invalid Format");
      
      // Validation: Check if sorted row-wise and col-wise
      for(let r=0; r<parsed.length; r++) {
        for(let c=0; c<parsed[0].length; c++) {
          if(c > 0 && parsed[r][c] > parsed[r][c-1]) throw new Error(`Row ${r} is not sorted!`);
          if(r > 0 && parsed[r][c] > parsed[r-1][c]) throw new Error(`Column ${c} is not sorted!`);
        }
      }
      setGrid(parsed);
      setCurrentStepIndex(0);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Invalid Matrix Format");
      setTimeout(() => setError(null), 3000);
    }
  };

  const getCellStatus = (r: number, c: number) => {
    const s = steps[currentStepIndex];
    if (s.actionType === 'found_negative_row' && s.highlightedCells.some(h => h.r === r && h.c === c)) return 'counted-negative';
    if (r === s.rowPointer && c === s.colPointer) return s.actionType === 'checking' ? 'checking' : 'pointer';
    return grid[r][c] < 0 ? 'static-negative' : 'default';
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex items-center justify-center font-sans">
      <Card className="w-full max-w-5xl shadow-2xl border-none">
        <CardHeader className="bg-white rounded-t-xl border-b">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <div className="w-2 h-8 bg-blue-600 rounded-full" /> Staircase Search Visualizer
              </CardTitle>
              <CardDescription>O(N+M) Complexity • Row/Col Sorted Only</CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <Input 
                value={inputValue} 
                onChange={(e) => setInputValue(e.target.value)}
                className="w-64 font-mono text-xs"
                placeholder="[[4,3], [2,1]]"
              />
              <Button onClick={handleInputChange} size="sm">Update Grid</Button>
            </div>
          </div>
          {error && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex items-center gap-2 text-red-500 text-sm mt-2 font-medium">
              <AlertCircle size={16}/> {error}
            </motion.div>
          )}
        </CardHeader>

        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50">
          {/* Visualizer Area */}
          <div className="md:col-span-2 flex flex-col items-center justify-center bg-white rounded-xl p-8 border shadow-sm min-h-[400px]">
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${m}, 50px)` }}>
              {grid.map((row, r) => row.map((val, c) => (
                <motion.div
                  key={`${r}-${c}`}
                  variants={cellVariants}
                  animate={getCellStatus(r, c)}
                  className="h-[50px] w-[50px] flex items-center justify-center rounded-lg text-sm font-bold border-2 relative"
                >
                  {val}
                </motion.div>
              )))}
            </div>
            
            <div className="mt-8 flex gap-4 items-center">
                <Badge variant="outline" className="text-lg py-1 px-4 bg-white shadow-sm border-blue-200">
                    Count: <span className="text-blue-600 ml-2">{steps[currentStepIndex].currentCount}</span>
                </Badge>
            </div>
          </div>

          {/* LogBox Area */}
          <div className="flex flex-col h-[400px]">
            <div className="flex items-center gap-2 mb-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <Info size={14}/> Algorithm Logs
            </div>
            <div className="flex-1 bg-slate-900 rounded-xl p-4 overflow-y-auto font-mono text-xs text-slate-300 shadow-inner border border-slate-800">
              {steps.slice(0, currentStepIndex + 1).map((s, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  key={i} 
                  className={`mb-2 pb-2 border-b border-slate-800 last:border-0 ${i === currentStepIndex ? 'text-blue-400 font-bold' : ''}`}
                >
                  <span className="text-slate-500 mr-2">[{i}]</span> {s.description}
                </motion.div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-white border-t p-6 flex justify-center gap-3 rounded-b-xl">
          <Button variant="outline" size="icon" onClick={() => {setIsPlaying(false); setCurrentStepIndex(0)}}><RotateCcw size={18}/></Button>
          <Button variant="outline" size="icon" onClick={() => {setIsPlaying(false); setCurrentStepIndex(i=>Math.max(0,i-1))}}><SkipBack size={18}/></Button>
          
          <Button 
            className={`w-40 h-12 text-white font-bold transition-all shadow-md ${isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <><Pause className="mr-2" /> Pause</> : <><Play className="mr-2" /> Play Algorithm</>}
          </Button>

          <Button variant="outline" size="icon" onClick={() => {setIsPlaying(false); setCurrentStepIndex(i=>Math.min(steps.length-1,i+1))}}><SkipForward size={18}/></Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CountNegativesVisualizer;