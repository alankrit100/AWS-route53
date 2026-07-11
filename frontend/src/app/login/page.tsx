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
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
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
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f2f3f3",
        padding: "24px",
      }}
    >
      <SpaceBetween size="xl" direction="vertical" alignItems="center">
        <img src="/aws-logo.svg" alt="AWS" width="45" height="30" />

        <div style={{ width: "100%", maxWidth: "400px" }}>
          <Container
            header={<Header variant="h1">Sign in to Route 53</Header>}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <Form>
                <SpaceBetween size="m" direction="vertical">
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
                </SpaceBetween>
              </Form>
            </form>
          </Container>
        </div>

        <Box variant="small" color="text-body-secondary" textAlign="center">
          Use username <strong>admin</strong> and password <strong>admin123</strong>.
        </Box>
      </SpaceBetween>
    </div>
  );
}
