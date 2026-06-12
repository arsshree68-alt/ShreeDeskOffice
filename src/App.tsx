function App() {
const suites = [
"PDF Suite",
"Excel Suite",
"Word Suite",
"PowerPoint Suite",
"Image Suite",
"Data Processing",
"Statistical Lab",
"Government Suite",
];

return (
<div
style={{
minHeight: "100vh",
background: "#0f172a",
color: "white",
padding: "40px",
fontFamily: "Segoe UI",
}}
>
<h1 style={{ fontSize: "3rem", marginBottom: "10px" }}>
ShreeDeskOffice </h1>

```
  <p style={{ color: "#94a3b8", marginBottom: "40px" }}>
    Documents • Data • Decisions
  </p>

  <input
    placeholder="Search tools..."
    style={{
      width: "100%",
      maxWidth: "600px",
      padding: "14px",
      borderRadius: "12px",
      border: "none",
      marginBottom: "40px",
    }}
  />

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
      gap: "20px",
    }}
  >
    {suites.map((suite) => (
      <div
        key={suite}
        style={{
          background: "#1e293b",
          padding: "24px",
          borderRadius: "16px",
          cursor: "pointer",
        }}
      >
        <h3>{suite}</h3>
        <p style={{ color: "#94a3b8" }}>
          Coming Soon
        </p>
      </div>
    ))}
  </div>
</div>

);
}

export default App;
