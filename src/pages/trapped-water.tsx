import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RefreshCw, Play, Pause, ChevronRight, ChevronLeft } from "lucide-react";

// --------------------------------------------------------------------------------
// TYPES & LOGIC
// --------------------------------------------------------------------------------

type StepDP = {
  activeIdx: number;
  leftMaxArr: (number | null)[];
  rightMaxArr: (number | null)[];
  totalWater: number;
  message: string;
  stage: "building-left" | "building-right" | "calculating-water" | "done";
};

type StepTwoPtr = {
  left: number;
  right: number;
  leftMax: number;
  rightMax: number;
  totalWater: number;
  currentWaterIdx: number | null; // index where water is currently being added
  message: string;
  done: boolean;
};

// --- ALGORITHM 1: DYNAMIC PROGRAMMING (O(N) Space) ---
function generateDPSteps(heights: number[]): StepDP[] {
  const steps: StepDP[] = [];
  const n = heights.length;
  if (n === 0) return [];

  let leftMax = new Array(n).fill(null);
  let rightMax = new Array(n).fill(null);
  let total = 0;

  // 1. Build Left Max
  leftMax[0] = heights[0];
  steps.push({
    activeIdx: 0,
    leftMaxArr: [...leftMax],
    rightMaxArr: [...rightMax],
    totalWater: 0,
    message: "Init LeftMax[0]",
    stage: "building-left",
  });

  for (let i = 1; i < n; i++) {
    leftMax[i] = Math.max(leftMax[i - 1], heights[i]);
    steps.push({
      activeIdx: i,
      leftMaxArr: [...leftMax],
      rightMaxArr: [...rightMax],
      totalWater: 0,
      message: `LeftMax[${i}] = max(${leftMax[i - 1]}, ${heights[i]}) = ${leftMax[i]}`,
      stage: "building-left",
    });
  }

  // 2. Build Right Max
  rightMax[n - 1] = heights[n - 1];
  steps.push({
    activeIdx: n - 1,
    leftMaxArr: [...leftMax],
    rightMaxArr: [...rightMax],
    totalWater: 0,
    message: "Init RightMax[last]",
    stage: "building-right",
  });

  for (let i = n - 2; i >= 0; i--) {
    rightMax[i] = Math.max(rightMax[i + 1], heights[i]);
    steps.push({
      activeIdx: i,
      leftMaxArr: [...leftMax],
      rightMaxArr: [...rightMax],
      totalWater: 0,
      message: `RightMax[${i}] = max(${rightMax[i + 1]}, ${heights[i]}) = ${rightMax[i]}`,
      stage: "building-right",
    });
  }

  // 3. Calculate Water
  for (let i = 0; i < n; i++) {
    const minHeight = Math.min(leftMax[i], rightMax[i]);
    const water = Math.max(0, minHeight - heights[i]);
    total += water;
    steps.push({
      activeIdx: i,
      leftMaxArr: [...leftMax],
      rightMaxArr: [...rightMax],
      totalWater: total,
      message: `Idx ${i}: min(${leftMax[i]}, ${rightMax[i]}) - ${heights[i]} = ${water}`,
      stage: "calculating-water",
    });
  }

  steps.push({ ...steps[steps.length - 1], stage: "done", message: "Complete!" });
  return steps;
}

// --- ALGORITHM 2: TWO POINTER (O(1) Space) ---
function generateTwoPtrSteps(heights: number[]): StepTwoPtr[] {
  const steps: StepTwoPtr[] = [];
  let n = heights.length;
  let left = 0;
  let right = n - 1;
  let leftMax = 0;
  let rightMax = 0;
  let total = 0;

  while (left <= right) {
    // We snapshot "before" the decision to show active pointers
    steps.push({
      left,
      right,
      leftMax,
      rightMax,
      totalWater: total,
      currentWaterIdx: null,
      message: `Compare height[${left}] (${heights[left]}) vs height[${right}] (${heights[right]})`,
      done: false,
    });

    if (heights[left] <= heights[right]) {
      if (heights[left] >= leftMax) {
        leftMax = heights[left];
        steps.push({
          left, right, leftMax, rightMax, totalWater: total, currentWaterIdx: null,
          message: `Update LeftMax to ${leftMax}`, done: false
        });
      } else {
        const water = leftMax - heights[left];
        total += water;
        steps.push({
          left, right, leftMax, rightMax, totalWater: total, currentWaterIdx: left,
          message: `Add water at ${left}: ${leftMax} - ${heights[left]} = ${water}`, done: false
        });
      }
      left++;
    } else {
      if (heights[right] >= rightMax) {
        rightMax = heights[right];
        steps.push({
          left, right, leftMax, rightMax, totalWater: total, currentWaterIdx: null,
          message: `Update RightMax to ${rightMax}`, done: false
        });
      } else {
        const water = rightMax - heights[right];
        total += water;
        steps.push({
          left, right, leftMax, rightMax, totalWater: total, currentWaterIdx: right,
          message: `Add water at ${right}: ${rightMax} - ${heights[right]} = ${water}`, done: false
        });
      }
      right--;
    }
  }

  steps.push({
    left: left, right: right, leftMax, rightMax, totalWater: total,
    currentWaterIdx: null, message: "Algorithm Finished", done: true
  });

  return steps;
}

// --------------------------------------------------------------------------------
// COMPONENT
// --------------------------------------------------------------------------------

export default function TrappedWaterVisualizer() {
  const [inputStr, setInputStr] = useState("0,1,0,2,1,0,1,3,2,1,2,1");
  const [heights, setHeights] = useState<number[]>([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]);

  // Timelines
  const [dpSteps, setDpSteps] = useState<StepDP[]>([]);
  const [tpSteps, setTpSteps] = useState<StepTwoPtr[]>([]);

  // Playback State
  const [idxDP, setIdxDP] = useState(0);
  const [idxTP, setIdxTP] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialization
  useEffect(() => {
    init();
  }, []);

  const init = () => {
    try {
      const inputValues = inputStr.split(",");

      // 1. Map, Trim, and Parse: Convert strings to numbers
      const numbers = inputValues.map(x => parseInt(x.trim()));

      // Array to store valid heights
      const validHeights = [];
      // Flag to check if any invalid input was found
      let hasInvalidInput = false;

      for (const num of numbers) {
        // Check 1: Is it a valid integer? (Not NaN, not a non-integer float like 10.5)
        // Use Number.isInteger() for a robust integer check
        if (isNaN(num) || !Number.isInteger(num)) {
          hasInvalidInput = true;
          continue; // Skip invalid entries
        }

        // Check 2: Is it greater than or equal to 0?
        if (num < 0) {
          hasInvalidInput = true;
          continue; // Skip negative entries
        }

        // If valid, add to the heights array
        validHeights.push(num);
      }

      if (hasInvalidInput) {
        // Display a warning to the user
        alert("Warning: Please ensure all inputs are valid integers and greater than or equal to 0. Invalid values were ignored.");
      }

      // Use the filtered and validated array
      setHeights(validHeights);
      setDpSteps(generateDPSteps(validHeights));
      setTpSteps(generateTwoPtrSteps(validHeights));
      setIdxDP(0);
      setIdxTP(0);
      setPlaying(false);

    } catch (e) {
      console.error("An error occurred during initialization:", e);
    }
  };

  // Playback Control
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setIdxDP(prev => (prev < dpSteps.length - 1 ? prev + 1 : prev));
        setIdxTP(prev => (prev < tpSteps.length - 1 ? prev + 1 : prev));
      }, 300); // Speed of animation
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, dpSteps, tpSteps]);

  // Handlers
  const stepForward = () => {
    setIdxDP(prev => Math.min(prev + 1, dpSteps.length - 1));
    setIdxTP(prev => Math.min(prev + 1, tpSteps.length - 1));
  };

  const stepBack = () => {
    setIdxDP(prev => Math.max(prev - 1, 0));
    setIdxTP(prev => Math.max(prev - 1, 0));
  };

  const reset = () => {
    setPlaying(false);
    setIdxDP(0);
    setIdxTP(0);
  };

  // Derived current states
  const curDP = dpSteps[idxDP];
  const curTP = tpSteps[idxTP];

  // --------------------------------------------------------------------------------
  // RENDERING HELPERS
  // --------------------------------------------------------------------------------

  // Calculates water height for DP approach based on current array state
  const getWaterHeightDP = (i: number, h: number) => {
    if (!curDP) return 0;
    // Only show water if we are in calculation phase or done, AND we have valid bounds
    if ((curDP.stage === "calculating-water" || curDP.stage === "done")) {
      const l = curDP.leftMaxArr[i] ?? 0;
      const r = curDP.rightMaxArr[i] ?? 0;
      const limit = Math.min(l, r);
      return Math.max(0, limit - h);
    }
    return 0;
  };

  // Calculates water height for Two Pointer approach
  // NOTE: Two pointer fills water "as it goes". We need to reconstruct "filled so far" 
  // or simply show the water if it was processed. 
  // For visualization simplicity: The 'water' in 2-ptr is implicit. 
  // We will show water *only* if that index has been processed as a "water" index in history.
  const getWaterHeightTP = (i: number, h: number) => {
    if (!curTP) return 0;

    // We scan history up to current index to see if water was added at this index
    // This is slightly expensive O(N*Steps) but fine for small N.
    const stepsSoFar = tpSteps.slice(0, idxTP + 1);
    // Find the LAST step that added water to this index
    const waterStep = stepsSoFar.reverse().find(s => s.currentWaterIdx === i);

    if (waterStep) {
      // Re-calculate the water amount from that snapshot
      if (waterStep.currentWaterIdx === waterStep.left) {
        return Math.max(0, waterStep.leftMax - h);
      } else {
        return Math.max(0, waterStep.rightMax - h);
      }
    }
    return 0;
  };

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6 font-sans text-slate-800">

      {/* HEADER & INPUT */}
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="w-full md:w-1/2 space-y-2">
          <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Elevation Map</label>
          <div className="flex gap-2">
            <Input
              value={inputStr}
              onChange={(e) => setInputStr(e.target.value)}
              className="font-mono text-lg"
              placeholder="e.g. 0,1,0,2,1,0,1,3,2,1,2,1"
            />
            <Button onClick={init} variant="default" className="bg-slate-300 hover:bg-slate-500">
              <RefreshCw className="w-4 h-4 mr-2" /> Initialize
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={stepBack} disabled={idxDP === 0 && idxTP === 0}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            className={`w-32 font-bold ${playing ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
            onClick={() => setPlaying(!playing)}
          >
            {playing ? <><Pause className="w-4 h-4 mr-2" /> Pause</> : <><Play className="w-4 h-4 mr-2" /> Play</>}
          </Button>
          <Button variant="outline" onClick={stepForward} disabled={curDP?.stage === "done" && curTP?.done}>
            <ChevronRight className="w-5 h-5" />
          </Button>
          <Button variant="ghost" onClick={reset}>Reset</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ================= LEFT COLUMN: DP APPROACH ================= */}
        <Card className="border-t-4 border-t-blue-500 shadow-md overflow-hidden">
          <CardHeader className="bg-slate-50 pb-4 border-b">
            <CardTitle className="flex justify-between items-center text-blue-700">
              <span>Approach 1: Dynamic Programming</span>
              <span className="text-xs bg-blue-100 px-2 py-1 rounded text-blue-800 border border-blue-200">
                Space: O(N)
              </span>
            </CardTitle>
            <div className="flex justify-between text-sm mt-2 text-slate-600">
              <span>Total Water: <b className="text-blue-600 text-lg">{curDP?.totalWater}</b></span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border">{curDP?.stage}</span>
            </div>
          </CardHeader>
          <CardContent className="p-6">

            {/* DP VISUALIZATION GRID */}
            {curDP && (
              <div className="flex items-end justify-center h-64 gap-1 border-b border-slate-300 pb-0 mb-6">
                {heights.map((h, i) => {
                  const waterH = getWaterHeightDP(i, h);
                  const isCurrent = curDP.activeIdx === i;
                  return (
                    <div key={i} className="relative flex flex-col justify-end w-8 md:w-10 h-full group">

                      {/* TOOLTIP */}
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs p-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-10 whitespace-nowrap">
                        idx: {i} | h: {h}
                      </div>

                      {/* WATER */}
                      {waterH > 0 && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: waterH * 24 }}
                          className="w-full bg-blue-400/80 border-x border-blue-500/30"
                        />
                      )}

                      {/* BLOCK */}
                      <motion.div
                        className={`w-full rounded-t-sm border border-slate-400 transition-colors duration-200 ${isCurrent ? 'bg-yellow-400' : 'bg-slate-300'}`}
                        animate={{ height: h * 24 }}
                      />

                      {/* INDEX */}
                      <div className="text-[10px] text-center mt-1 text-slate-400">{i}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* AUX ARRAYS VISUALIZATION */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold w-16 text-right">Left Max:</span>
                <div className="flex gap-1 flex-1 overflow-x-auto pb-1">
                  {curDP?.leftMaxArr.map((val, i) => (
                    <div key={i} className={`text-xs w-8 h-8 flex items-center justify-center border rounded ${curDP.activeIdx === i && curDP.stage === 'building-left' ? 'bg-blue-100 border-blue-500 font-bold' : 'bg-slate-50'}`}>
                      {val ?? '-'}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold w-16 text-right">Right Max:</span>
                <div className="flex gap-1 flex-1 overflow-x-auto pb-1">
                  {curDP?.rightMaxArr.map((val, i) => (
                    <div key={i} className={`text-xs w-8 h-8 flex items-center justify-center border rounded ${curDP.activeIdx === i && curDP.stage === 'building-right' ? 'bg-blue-100 border-blue-500 font-bold' : 'bg-slate-50'}`}>
                      {val ?? '-'}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-100 rounded text-sm font-mono text-slate-700 min-h-[60px]">
              {curDP?.message}
            </div>
          </CardContent>
        </Card>


        {/* ================= RIGHT COLUMN: TWO POINTER APPROACH ================= */}
        <Card className="border-t-4 border-t-purple-500 shadow-md overflow-hidden">
          <CardHeader className="bg-slate-50 pb-4 border-b">
            <CardTitle className="flex justify-between items-center text-purple-700">
              <span>Approach 2: Two Pointers</span>
              <span className="text-xs bg-purple-100 px-2 py-1 rounded text-purple-800 border border-purple-200">
                Space: O(1)
              </span>
            </CardTitle>
            <div className="flex justify-between text-sm mt-2 text-slate-600">
              <span>Total Water: <b className="text-purple-600 text-lg">{curTP?.totalWater}</b></span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border">{curTP?.done ? "done" : "running"}</span>
            </div>
          </CardHeader>
          <CardContent className="p-6">

            {/* TP VISUALIZATION GRID */}
            {curTP && (
              <div className="flex items-end justify-center h-64 gap-1 border-b border-slate-300 pb-0 mb-6">
                {heights.map((h, i) => {
                  const waterH = getWaterHeightTP(i, h);

                  // Highlight pointers
                  const isLeft = curTP.left === i;
                  const isRight = curTP.right === i;

                  return (
                    <div key={i} className="relative flex flex-col justify-end w-8 md:w-10 h-full">

                      {/* POINTER INDICATORS */}
                      {isLeft && <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-purple-600">L</div>}
                      {isRight && <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-pink-600">R</div>}

                      {/* WATER */}
                      {waterH > 0 && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: waterH * 24 }}
                          className="w-full bg-blue-400/80 border-x border-blue-500/30"
                        />
                      )}

                      {/* BLOCK */}
                      <motion.div
                        className={`w-full rounded-t-sm border border-slate-400 transition-all duration-200 
                          ${isLeft || isRight ? 'bg-purple-200 border-purple-400' : 'bg-slate-300'}
                          ${curTP.currentWaterIdx === i ? '!bg-blue-300' : ''}
                        `}
                        animate={{ height: h * 24 }}
                      />

                      {/* INDEX */}
                      <div className="text-[10px] text-center mt-1 text-slate-400 font-mono">
                        {isLeft || isRight ? <span className="text-black font-bold">{i}</span> : i}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* POINTER STATE */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-purple-50 rounded border border-purple-100 flex flex-col items-center">
                <span className="text-xs uppercase font-bold text-purple-400">Left Max</span>
                <span className="text-2xl font-bold text-purple-700">{curTP?.leftMax}</span>
              </div>
              <div className="p-3 bg-pink-50 rounded border border-pink-100 flex flex-col items-center">
                <span className="text-xs uppercase font-bold text-pink-400">Right Max</span>
                <span className="text-2xl font-bold text-pink-700">{curTP?.rightMax}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-100 rounded text-sm font-mono text-slate-700 min-h-[60px]">
              {curTP?.message}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}