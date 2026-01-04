import React from "react";
import "./index.css"; // <-- important
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import PrefixSumVisualizer from "./pages/prefix-sum"; // <-- your visualizer file
import DnfStep from "./pages/dnf"
import TrappedWaterVisualizer from "./pages/trapped-water";
import MeetInTheMiddleVisualizer from "./pages/meet-in-the-middle";
import CountNegativesVisualizer from "./pages/count-negatives";
import GreedyStringVisualizer from "./pages/greedy-binary-string";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/prefix-sum" element={<PrefixSumVisualizer />} />
        <Route path="/dnf" element={<DnfStep />} />
        <Route path="/trapped-water" element={<TrappedWaterVisualizer />} />
        <Route path="/meet-in-the-middle" element={<MeetInTheMiddleVisualizer />} />
        <Route path="/count-negatives" element={<CountNegativesVisualizer />} />
        <Route path="/greedy-binary-string" element={<GreedyStringVisualizer />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
