// frontend/src/pages/ApiDocs.jsx
export default function ApiDocs(){
  return (
    <div className="page">
      <h2 className="ui-mono" style={{marginTop:0}}>API Documentation</h2>
      <div className="card" style={{height:"75vh", overflow:"hidden"}}>
        <iframe title="API Docs" src="/api/docs" style={{border:0, width:"100%", height:"100%"}} />
      </div>
    </div>
  );
}
