import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";
import { useMemo } from "react";

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.paragraph}>
        RGPV Resources (“we”, “our”, or “the app”) respects the privacy of its users.
        This Privacy Policy explains how we collect, use, and protect your information
        when you use our application.
      </Text>
      <Text style={styles.heading}>1. Information We Collect</Text>
      <Text style={styles.paragraph}>
        We may collect the following types of information:{`\n`}
        • Basic account information such as name or email address when you sign in.{`\n`}
        • Device information such as device type, operating system, and app usage data.{`\n`}
        • Analytics information to improve app performance and user experience.{`\n`}
        We do not collect sensitive personal information such as passwords, financial
        details, or private documents.
      </Text>
      <Text style={styles.heading}>2. How We Use Information</Text>
      <Text style={styles.paragraph}>
        The collected information may be used to:{`\n`}
        • Provide and maintain app services{`\n`}
        • Improve application performance and features{`\n`}
        • Send important updates or notifications related to the app{`\n`}
        • Analyze usage trends to improve student resources
      </Text>
      <Text style={styles.heading}>3. Third-Party Services</Text>
      <Text style={styles.paragraph}>
        The app may use third-party services such as:{`\n`}
        • Firebase (Authentication, Database, Analytics){`\n`}
        • Hosting services for app content{`\n`}
        These services may collect limited technical information according to their
        own privacy policies.
      </Text>
      <Text style={styles.heading}>4. Data Security</Text>
      <Text style={styles.paragraph}>
        We take reasonable measures to protect user data from unauthorized access,
        misuse, or disclosure.
      </Text>
      <Text style={styles.heading}>5. Children’s Privacy</Text>
      <Text style={styles.paragraph}>
        This application is intended for students and does not knowingly collect
        personal information from children under 13 years of age.
      </Text>
      <Text style={styles.heading}>6. Changes to this Privacy Policy</Text>
      <Text style={styles.paragraph}>
        We may update this Privacy Policy from time to time. Any changes will be
        updated within the app.
      </Text>
      <Text style={styles.heading}>7. Contact Us</Text>
      <Text style={styles.paragraph}>
        If you have any questions regarding this Privacy Policy, please contact us at:{`\n`}
        Email: Rgpvresources@gmail.com
      </Text>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      backgroundColor: colors.background,
    },
    title: {
      fontFamily: "Inter_700Bold",
      fontSize: 22,
      color: colors.text,
      marginBottom: 12,
    },
    heading: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 16,
      color: colors.text,
      marginTop: 16,
      marginBottom: 6,
    },
    paragraph: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
  });
}
