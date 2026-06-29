import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import * as React from "react";

// Satisfy tsc unused variable check while keeping it for build script
if (false as boolean) {
  console.log(React.version);
}

interface PulseEarnEmailProps {
  userFirstname?: string;
  actionUrl?: string;
  title: string;
  preview: string;
  content: string;
  buttonText?: string;
}

export const PulseEarnEmail = ({
  userFirstname = "there",
  actionUrl = "https://pulseearn.online",
  title,
  preview,
  content,
  buttonText,
}: PulseEarnEmailProps) => (
  <Html>
    <Head />
    <Preview>{preview}</Preview>
    <Tailwind>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Img
              src="https://pulseearn.online/logo.png"
              width="170"
              height="50"
              alt="PulseEarn"
            />
          </Section>
          <Section style={contentSection}>
            <Text style={heading}>{title}</Text>
            <Text style={paragraph}>Hi {userFirstname},</Text>
            <Text style={paragraph}>
              {content}
            </Text>
            {buttonText && (
              <Section style={buttonContainer}>
                <Button style={button} href={actionUrl}>
                  {buttonText}
                </Button>
              </Section>
            )}
            <Text style={paragraph}>
              Best,
              <br />
              The PulseEarn Team
            </Text>
          </Section>
          <Hr style={hr} />
          <Section style={footerSection}>
            <Text style={footer}>
              PulseEarn Authority • Global Rewards Network
            </Text>
            <Text style={footer}>
              123 Blockchain Way, Digital City, WEB3 001
            </Text>
            <Text style={footer}>
              You are receiving this because you are a registered member of PulseEarn.
              <br />
              <a href="https://pulseearn.online/me/preferences" style={link}>Unsubscribe</a> • <a href="https://pulseearn.online/privacy" style={link}>Privacy Policy</a>
            </Text>
            <Text style={footer}>
              If you didn't request this email, you can safely ignore it.
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default PulseEarnEmail;

const main = {
  backgroundColor: "#050507",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "580px",
};

const logoContainer = {
  padding: "32px",
  textAlign: "center" as const,
};

const contentSection = {
  padding: "0 48px",
};

const heading = {
  fontSize: "32px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#ffffff",
  letterSpacing: "-0.02em",
  textTransform: "uppercase" as const,
  fontStyle: "italic",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#a1a1aa",
};

const buttonContainer = {
  textAlign: "center" as const,
  marginTop: "32px",
  marginBottom: "32px",
};

const button = {
  backgroundColor: "#0070FF",
  borderRadius: "12px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 28px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
};

const hr = {
  borderColor: "#27272a",
  margin: "42px 0 26px",
};

const footerSection = {
  padding: "0 48px",
};

const footer = {
  color: "#52525b",
  fontSize: "12px",
  lineHeight: "24px",
  textAlign: "center" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

const link = {
  color: "#0070FF",
  textDecoration: "underline",
};
