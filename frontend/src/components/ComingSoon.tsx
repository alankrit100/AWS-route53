"use client";

import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";

export function ComingSoon({ title }: { title: string }) {
  return (
    <div style={{ padding: "24px" }}>
      <Container header={<Header variant="h1">{title}</Header>}>
        <SpaceBetween size="m" direction="vertical" alignItems="center">
          <Box variant="h2" color="text-body-secondary">
            🚧
          </Box>
          <Box variant="h2" textAlign="center">
            {title} is not available in this demo
          </Box>
          <Box variant="p" textAlign="center" color="text-body-secondary">
            This Route 53 console clone focuses on hosted zones and DNS records.
            Check back later for {title.toLowerCase()} functionality.
          </Box>
        </SpaceBetween>
      </Container>
    </div>
  );
}
