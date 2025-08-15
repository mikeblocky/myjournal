import Topbar from "../Topbar/Topbar";
import PerformanceMonitor from "../PerformanceMonitor";

export default function Shell({ children }){
  return (
    <>
      <Topbar />
      <main className="page fade-in" role="main">
        {children}
      </main>
      <PerformanceMonitor />
    </>
  );
}
