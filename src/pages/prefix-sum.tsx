import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

/**
 * PREFIX SUM VISUALIZER – STEP FORWARD / STEP BACKWARD / PLAY MODE
 * Smooth animations, full control, default array + custom array
 */

export default function PrefixSumVisualizer() {
  const defaultArray = [1, -1, 2, -2, 3, -3, 4];

  const [arr, setArr] = useState<number[]>(defaultArray);
  const [k, setK] = useState<number>(3);

  const [steps, setSteps] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playRef = useRef<number | null>(null);

  /** Generate all algorithm steps (prefix-sum hashmap simulation) */
  const generateSteps = () => {
    let prefix = 0;
    let d: Record<number, number> = { 0: -1 };

    const stepLog: any[] = [];

    arr.forEach((num, i) => {
      const oldPrefix = prefix;
      prefix += num;

      stepLog.push({
        type: "update-prefix",
        index: i,
        oldPrefix,
        newPrefix: prefix,
        hashmap: { ...d },
      });

      if (prefix - k in d) {
        stepLog.push({
          type: "match",
          index: i,
          start: d[prefix - k] + 1,
          end: i,
          hashmap: { ...d },
        });
      }

      if (!(prefix in d)) {
        stepLog.push({
          type: "hash-insert",
          index: i,
          prefix,
          hashmap: { ...d, [prefix]: i },
        });
        d[prefix] = i;
      }
    });

    setSteps(stepLog);
  };

  // regenerate steps whenever array or k changes
  useEffect(() => {
    generateSteps();
    setCurrentStep(0);
    setIsPlaying(false);
  }, [arr, k]);

  // current step snapshot (define before effects that might reference it)
  const step = steps[currentStep] || null;

  /** Playback controller */
  useEffect(() => {
    if (isPlaying) {
      // clear any existing interval
      if (playRef.current) {
        clearInterval(playRef.current);
      }
      playRef.current = window.setInterval(() => {
        setCurrentStep((s) => {
          if (s + 1 >= steps.length) {
            // reached end
            if (playRef.current) {
              clearInterval(playRef.current);
              playRef.current = null;
            }
            setIsPlaying(false);
            return s;
          }
          return s + 1;
        });
      }, 700);
    } else {
      if (playRef.current) {
        clearInterval(playRef.current);
        playRef.current = null;
      }
    }

    return () => {
      if (playRef.current) {
        clearInterval(playRef.current);
        playRef.current = null;
      }
    };
  }, [isPlaying, steps]);

  // Derived live values for UI (computed in render scope where `step` is available)
  const prefixValue = step?.newPrefix ?? null;
  const answerSoFar = steps
    .slice(0, currentStep + 1)
    .filter((s) => s.type === "match")
    .reduce((acc, m) => Math.max(acc, m.end - m.start + 1), 0);

  const algoFinished = steps.length > 0 && currentStep === steps.length - 1;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Card className="p-4">
        <h2 className="text-xl font-bold mb-3">Prefix Sum Subarray Visualizer</h2>
        <div className="flex gap-4 mb-4">
          <input
            className="border p-2 rounded w-1/2"
            placeholder="Enter array e.g. 1,-1,2"
            defaultValue={defaultArray.join(",")}
            onBlur={(e) => {
              const raw = (e.target as HTMLInputElement).value.trim();
              if (!raw) return;
              const v = raw.split(",").map((s) => Number(s.trim()));
              if (v.length > 0 && v.every((x) => !isNaN(x))) setArr(v);
            }}
          />
          <input
            className="border p-2 rounded w-24"
            placeholder="k"
            value={k}
            onChange={(e) => {
              const val = Number((e.target as HTMLInputElement).value);
              if (!isNaN(val)) setK(val);
            }}
          />
        </div>

        <div className="flex gap-4">
          <Button className="hover:cursor-pointer" onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}>
            Step Back
          </Button>
          <Button className="hover:cursor-pointer" onClick={() => setCurrentStep((s) => Math.min(steps.length - 1, s + 1))}>
            Step Forward
          </Button>
          <Button className="hover:cursor-pointer" onClick={() => setIsPlaying((p) => !p)}>
            {isPlaying ? "Pause" : "Play"}
          </Button>
          <Button
            className="hover:cursor-pointer"
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep(0);
            }}
          >
            Reset
          </Button>
        </div>
      </Card>

      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold">Array</h3>
          <div className="flex gap-4 mt-4">
            {arr.map((num, idx) => (
              <motion.div
                key={idx}
                layout
                animate={{ scale: step?.index === idx ? 1.12 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`p-4 rounded-xl shadow text-center w-14 ${step?.index === idx ? "bg-blue-200" : "bg-gray-100"
                  }`}
              >
                {num}
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-3">Explanation</h3>
          {step ? (
            <div className="p-4 bg-gray-50 rounded-xl border">
              {step.type === "update-prefix" && (
                <p>
                  Updating prefix sum at index <b>{step.index}</b>: from {step.oldPrefix} to {step.newPrefix}
                </p>
              )}

              {step.type === "match" && (
                <p>
                  Match found: subarray <b>{step.start}</b> to <b>{step.end}</b> sums to k
                </p>
              )}

              {step.type === "hash-insert" && (
                <p>
                  Storing prefix {step.prefix} in hashmap at index {step.index}
                </p>
              )}
            </div>
          ) : (
            <p>No step loaded.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold">Prefix Hashmap</h3>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {step &&
              (Object.entries(step.hashmap) as [string, number][]).map(([key, val]) => (
                <motion.div
                  key={key}
                  layout
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="p-3 rounded-xl bg-yellow-100 shadow text-center"
                >
                  <p>prefix = {key}</p>
                  <p>index = {val}</p>
                </motion.div>
              ))}
          </div>
        </CardContent>
      </Card>


      {/* Prefix + Answer Visualization */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-2">Live Values</h3>
          <div className="flex gap-6 p-4 bg-gray-50 rounded-xl border">
            <div>
              <p className="text-sm text-gray-600">Prefix Sum</p>
              <motion.p layout className="text-2xl font-bold">
                {prefixValue !== null ? prefixValue : "–"}
              </motion.p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Longest Length Found</p>
              <motion.p layout className="text-2xl font-bold">
                {answerSoFar}
              </motion.p>
            </div>
          </div>

          {algoFinished && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 p-4 bg-green-100 border text-green-800 rounded-xl text-center"
            >
              ✔ Algorithm completed gracefully. Final longest subarray length = <b>{answerSoFar}</b>.
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
