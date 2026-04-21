import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Text,
} from "react-email";
import * as React from "react";

interface SendEmailProps {
  name: string;
  pendingAmount: number;
  date: string;
  recipient: string;
}


export const SendEmail = ({
  name,
  pendingAmount,
  date,
  recipient,
}: SendEmailProps) => (
  <Html>
    <Head />
    <Preview>
    Your portal to the lyrical world of music!
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Container style={imgContainer}>
        Hisaab
          </Container>
        <Text style={paragraph}>Hi {name},</Text>
       
        <Text style={paragraph}>
          You have a pending amount of Rs.<strong>{pendingAmount.toFixed(2)}</strong> that is due on <strong>{date}</strong>. Please make sure to settle it to <strong>{recipient}</strong> by the due date to avoid any inconvenience.
        </Text>
        <Text style={paragraph}>
          Best,
          <br />
         Hisaab
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Kathmandu, Nepal
        </Text>
      </Container>
    </Body>
  </Html>
);

SendEmail.PreviewProps = {
  name: "Alan",
  pendingAmount: 100,
  date: "2024-01-01",
  recipient: "alan@example.com",
} as SendEmailProps;

export default SendEmail;

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const imgContainer = {
  backgroundColor: "#2563eb",
  textAlign: "center" as const,
  padding: "20px",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "bold" as const,
}

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
};

const logo = {
  margin: "0 auto",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
};



const hr = {
  borderColor: "#cccccc",
  margin: "20px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
};
