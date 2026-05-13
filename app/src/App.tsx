import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Simulacao from "./pages/Simulacao";
import Comparacao from "./pages/Comparacao";
import Calculadora from "./pages/Calculadora";
import Historico from "./pages/Historico";
import Guia from "./pages/Guia";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/simulacao" element={<Simulacao />} />
        <Route path="/comparacao" element={<Comparacao />} />
        <Route path="/calculadora" element={<Calculadora />} />
        <Route path="/historico" element={<Historico />} />
        <Route path="/guia" element={<Guia />} />
      </Route>
    </Routes>
  );
}
