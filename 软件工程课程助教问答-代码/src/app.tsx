import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import ChatPage from "@/pages/ChatPage/ChatPage";
import PromptPage from "@/pages/PromptPage/PromptPage";
import EvalPage from "@/pages/EvalPage/EvalPage";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ChatPage />} />
        <Route path="prompt" element={<PromptPage />} />
        <Route path="eval" element={<EvalPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
