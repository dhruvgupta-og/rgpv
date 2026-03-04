import { ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";
import { useMemo } from "react";

export default function CopyrightScreen() {
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
      <Text style={styles.title}>Copyright Notice</Text>
      <Text style={styles.paragraph}>
        All previous year question papers and academic materials available in this
        application are provided strictly for educational and reference purposes.
        The copyrights of these materials belong to their respective owners, including
        Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV) or other authorized institutions.
      </Text>
      <Text style={styles.paragraph}>
        This application does not claim ownership of university examination papers or
        official academic content.
      </Text>
      <Text style={styles.heading}>Use of Materials</Text>
      <Text style={styles.paragraph}>
        • Do not resell or commercially distribute PDFs{`\n`}
        • Cite original sources where applicable{`\n`}
        • Request removal if you own any content and want it taken down
      </Text>
      <Text style={styles.heading}>Takedown Requests</Text>
      <Text style={styles.paragraph}>
        If any copyright holder believes that content available in this app violates
        their rights, they may contact us with proper details. We will review the
        request and remove the content if necessary.{`\n`}
        Contact Email: Rgpvresources@gmail.com
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
