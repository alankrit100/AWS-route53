"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@cloudscape-design/components/button";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Alert from "@cloudscape-design/components/alert";
import { auth, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await auth.login(username, password);
      setToken(res.token);
      router.push("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f2f3f3",
      }}
    >
      <div style={{ width: "400px" }}>
        <Container
          header={<Header variant="h1">Route 53 Console</Header>}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <Form>
              {error && (
                <Alert type="error" dismissible onDismiss={() => setError("")}>
                  {error}
                </Alert>
              )}
              <FormField label="Username">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.detail.value)}
                  placeholder="admin"
                />
              </FormField>
              <FormField label="Password">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.detail.value)}
                  placeholder="admin123"
                />
              </FormField>
              <Button variant="primary" loading={loading} formAction="submit">
                Sign in
              </Button>
            </Form>
          </form>
        </Container>
      </div>
    </div>
  );
}
