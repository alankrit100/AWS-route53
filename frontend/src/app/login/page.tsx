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
import Tabs from "@cloudscape-design/components/tabs";
import { auth, setTokens } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = tab === "signin"
        ? await auth.login(username, password)
        : await auth.signup(username, password);
      setTokens(res.access_token, res.refresh_token);
      router.push("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const isValid = tab === "signup"
    ? username.trim().length >= 3 && password.length >= 6 && password === confirmPassword
    : username.trim() && password;

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

        <div style={{ width: "100%", maxWidth: "420px" }}>
          <Container>
            <Tabs
              activeTabId={tab}
              onChange={(e) => {
                setTab(e.detail.activeTabId);
                setError("");
              }}
              tabs={[
                {
                  id: "signin",
                  label: "Sign in",
                  content: (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit();
                      }}
                    >
                      <Form>
                        <SpaceBetween size="m" direction="vertical">
                          {error ? <Alert key="error" type="error" dismissible onDismiss={() => setError("")}>{error}</Alert> : null}
                          <FormField key="user" label="Username">
                            <Input
                              value={username}
                              onChange={(e) => setUsername(e.detail.value)}
                              placeholder="Enter your username"
                            />
                          </FormField>
                          <FormField key="pass" label="Password">
                            <Input
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.detail.value)}
                              placeholder="Enter your password"
                            />
                          </FormField>
                          <Button variant="primary" loading={loading} disabled={!isValid} formAction="submit">
                            Sign in
                          </Button>
                        </SpaceBetween>
                      </Form>
                    </form>
                  ),
                },
                {
                  id: "signup",
                  label: "Create account",
                  content: (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit();
                      }}
                    >
                      <Form>
                        <SpaceBetween size="m" direction="vertical">
                          {error ? <Alert key="error" type="error" dismissible onDismiss={() => setError("")}>{error}</Alert> : null}
                          <FormField key="user" label="Username" description="At least 3 characters">
                            <Input
                              value={username}
                              onChange={(e) => setUsername(e.detail.value)}
                              placeholder="Choose a username"
                            />
                          </FormField>
                          <FormField key="pass" label="Password" description="At least 6 characters">
                            <Input
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.detail.value)}
                              placeholder="Create a password"
                            />
                          </FormField>
                          <FormField key="confirm" label="Confirm password">
                            <Input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.detail.value)}
                              placeholder="Re-enter your password"
                            />
                          </FormField>
                          <Button variant="primary" loading={loading} disabled={!isValid} formAction="submit">
                            Create account
                          </Button>
                        </SpaceBetween>
                      </Form>
                    </form>
                  ),
                },
              ]}
            />
          </Container>
        </div>

        <Box variant="small" color="text-body-secondary" textAlign="center">
          Demo credentials — <strong>admin</strong> / <strong>admin123</strong>
        </Box>
      </SpaceBetween>
    </div>
  );
}
