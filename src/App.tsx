import { Link } from "react-router-dom";

export default function App() {
  return (
    <div className="p-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Algorithm Visualizers</h1>

      <ul className="space-y-4">
        <li>
          <Link
            to="/prefix-sum"
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Prefix Sum
          </Link>
          <span className="mx-[10px]">(Find largest subarray with sum == k)</span>
        </li>
        <li>
          <Link
            to="/dnf"
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Dutch National Flag
          </Link>
          <span className="mx-[10px]">(Sort an array of 0s,1s,2s)</span>
        </li>
        <li>
          <Link
            to="/trapped-water"
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
           Trapped Water 1 
          </Link>
          <a href="https://leetcode.com/problems/trapping-rain-water/description/)" target="_blank" className="mx-[10px] text-[blue]">(Leetcode)</a>
        </li>
        {/* Add more algorithm links here in the future */}
      </ul>
    </div>
  );
}
