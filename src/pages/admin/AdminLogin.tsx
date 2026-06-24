import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdminLoginProps {
  passwordInput: string;
  setPasswordInput: (v: string) => void;
  login: () => void;
  loginLoading: boolean;
}

export default function AdminLogin({ passwordInput, setPasswordInput, login, loginLoading }: AdminLoginProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-sm flex flex-col gap-5">
        <h1 className="text-2xl font-bold text-center">Вход в админку</h1>
        <div className="flex flex-col gap-2">
          <Label>Пароль</Label>
          <Input type="password" value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login()}
            placeholder="Введите пароль" />
        </div>
        <Button onClick={login} disabled={loginLoading}>
          {loginLoading ? "Проверяем..." : "Войти"}
        </Button>
      </div>
    </div>
  );
}
