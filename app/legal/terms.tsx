import { ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";
import { useMemo } from "react";

export default function TermsScreen() {
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
      <Text style={styles.title}>Terms & Conditions</Text>
      <Text style={styles.paragraph}>
        By downloading or using the RGPV Resources application, you agree to the
        following terms and conditions.
      </Text>
      <Text style={styles.heading}>1. Educational Purpose</Text>
      <Text style={styles.paragraph}>
        This application provides academic resources such as previous year question
        papers, study materials, and exam-related information for students. All content
        is intended strictly for educational purposes.
      </Text>
      <Text style={styles.heading}>2. No Official Affiliation</Text>
      <Text style={styles.paragraph}>
        This app is not affiliated with, endorsed by, or officially connected with
        Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV), Bhopal. Any references to
        RGPV are used only to identify relevant academic resources for students.
      </Text>
      <Text style={styles.heading}>3. Accuracy of Content</Text>
      <Text style={styles.paragraph}>
        While we try to keep the information accurate and updated, we do not guarantee
        the completeness or accuracy of all materials. Students should verify important
        academic details through official university sources.
      </Text>
      <Text style={styles.heading}>4. User Responsibility</Text>
      <Text style={styles.paragraph}>
        Users agree not to misuse the application or attempt to copy, modify, or
        distribute app content without permission.
      </Text>
      <Text style={styles.heading}>5. Updates and Changes</Text>
      <Text style={styles.paragraph}>
        We may update, modify, or discontinue any part of the application without
        prior notice.
      </Text>
      <Text style={styles.heading}>6. Limitation of Liability</Text>
      <Text style={styles.paragraph}>
        The app developers shall not be responsible for any academic decisions or
        results based on the information provided in the application.
      </Text>
      <Text style={styles.heading}>7. Contact</Text>
      <Text style={styles.paragraph}>
        For questions or concerns, contact:{`\n`}
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
