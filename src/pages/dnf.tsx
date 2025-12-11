import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type StepState = {
  arr: number[];
  low: number;
  mid: number;
  high: number;
  msg: string;
  done: boolean;
};

// ------------------------------------------------------
// DNF Step Logic
// ------------------------------------------------------
function DnfStep(nums: number[], low: number, mid: number, high: number) {
  if (mid > high) {
    return {
      arr: nums,
      low,
      mid,
      high,
      done: true,
      msg: `Pointers → low=${low}, mid=${mid}, high=${high}\nAlgorithm completed.`,
    };
  }

  const value = nums[mid];

  // Case 0
  if (value === 0) {
    [nums[low], nums[mid]] = [nums[mid], nums[low]];
    return {
      arr: nums,
      low: low + 1,
      mid: mid + 1,
      high,
      done: false,
      msg: `nums[mid] = 0 → swap(low=${low}, mid=${mid})`,
    };
  }

  // Case 1
  if (value === 1) {
    return {
      arr: nums,
      low,
      mid: mid + 1,
      high,
      done: false,
      msg: `nums[mid] = 1 → move mid → ${mid + 1}`,
    };
  }

  // Case 2
  [nums[mid], nums[high]] = [nums[high], nums[mid]];
  return {
    arr: nums,
    low,
    mid,
    high: high - 1,
    done: false,
    msg: `nums[mid] = 2 → swap(mid=${mid}, high=${high})`,
  };
}

// ------------------------------------------------------
// Component
// ------------------------------------------------------
export default function DNF() {
  const [arrInput, setArrInput] = useState("2,0,2,1,1,0");
  const [history, setHistory] = useState<StepState[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ------------------------------------------------------
  // Initialize
  // ------------------------------------------------------
  const initialize = () => {
    try {
      const arr = arrInput
        .split(",")
        .map((x) => Number(x.trim()));

      if (!arr.every((x) => [0, 1, 2].includes(x))) {
        alert("Array must contain only 0, 1, 2");
        return;
      }

      const init: StepState = {
        arr,
        low: 0,
        mid: 0,
        high: arr.length - 1,
        msg: `Initialized array: ${arr}`,
        done: false,
      };

      setHistory([init]);
      setIndex(0);
      setPlaying(false);
    } catch (e) {
      alert("Invalid input");
    }
  };

  // ------------------------------------------------------
  // Next Step
  // ------------------------------------------------------
  const next = () => {
    const cur = history[index];

    if (cur.done) return;

    const newArr = [...cur.arr];
    const step = DnfStep(newArr, cur.low, cur.mid, cur.high);

    const newState: StepState = {
      arr: [...step.arr],
      low: step.low,
      mid: step.mid,
      high: step.high,
      msg: step.msg,
      done: step.done,
    };

    const updated = [...history.slice(0, index + 1), newState];

    setHistory(updated);
    setIndex((i) => i + 1);
  };

  const prev = () => {
    if (index > 0) {
      setIndex((i) => i - 1);
      setPlaying(false);
    }
  };

  // ------------------------------------------------------
  // Auto Play / Pause
  // ------------------------------------------------------
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        const cur = history[index];
        if (cur && !cur.done) next();
        else setPlaying(false);
      }, 900);
    } else if (!playing && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, index, history]);

  const state = history[index];

  return (
    <div className="p-6 flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Dutch National Flag Visualizer</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* -------------------- Initialization -------------------- */}
          <div className="flex gap-3">
            <Input
              value={arrInput}
              onChange={(e) => setArrInput(e.target.value)}
              placeholder="Enter comma separated 0,1,2"
            />
            <Button className="border-4  cursor-pointer" onClick={initialize}>Initialize</Button>
          </div>

          {state && (
            <>
              {/* -------------------- Array Visualization -------------------- */}
              <div>
  <h3 className="font-semibold mb-2">Array</h3>

  {/* ARRAY GRID WITH PER-ITEM POINTERS */}
  <div className="flex flex-wrap gap-4 max-w-full">
    {state.arr.map((num, i) => (
      <div key={i} className="flex flex-col items-center">
        
        {/* VALUE BOX */}
        <motion.div
          layout
          className="w-14 h-14 rounded-xl text-black font-bold flex items-center justify-center shadow"
          style={{
            background:
              num === 0 ? "#21468B" :
              num === 1 ? "#FFFFFF" :
                          "#AE1C28",
            color: num === 1 ? "black" : "white"
          }}
        >
          {num}
        </motion.div>

        {/* INDEX */}
        <div className="text-xs font-semibold text-gray-400 mt-1">
          {i}
        </div>

        {/* POINTERS DIRECTLY UNDER EACH BLOCK */}
        <div className="text-sm font-bold h-5">
          {i === state.low && <span className="text-red-500">L</span>}
          {i === state.mid && <span className="text-blue-500"> M</span>}
          {i === state.high && <span className="text-green-600"> H</span>}
        </div>

      </div>
    ))}
  </div>
</div>


              {/* -------------------- Controls -------------------- */}
              <div className="flex gap-3">
                <Button className="border-4  cursor-pointer" onClick={prev}>Previous</Button>
                <Button className="border-4 cursor-pointer" onClick={next}>Next</Button>
                <Button className="border-4 cursor-pointer" onClick={() => setPlaying(!playing)}>
                  {playing ? "Pause" : "Play"}
                </Button>
              </div>

              {/* -------------------- Logs -------------------- */}
              <div>
                <h3 className="font-semibold mb-2">Step Log</h3>
                <div className="bg-[#ecefcc] max-w-[500px] text-[#000000] text-sm p-3 rounded-lg h-48  overflow-y-scroll  font-mono">
                  {history.slice(0, index + 1).map((h, i) => (
                    <div key={i} className="mb-3">
                      <b>Step {i}:</b> {h.msg}
                    </div>
                  ))}
                </div>
              </div>

              {/* -------------------- Completion Message -------------------- */}
              {state.done && (
                <div className="p-4 bg-green-600 text-white rounded-xl font-semibold">
                  Algorithm Completed Successfully!
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
