import Topbar from "../Topbar/Topbar";

export default function Shell({ children }){
  return (
    <>
      <Topbar />
      <main className="page fade-in" role="main">
        {children}
      </main>
    </>
  );
}
