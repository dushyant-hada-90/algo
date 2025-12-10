import React from "react";
import "./index.css"; // <-- important

import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import PrefixSumVisualizer from "./pages/prefix-sum"; // <-- your visualizer file

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/prefix-sum" element={<PrefixSumVisualizer />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
