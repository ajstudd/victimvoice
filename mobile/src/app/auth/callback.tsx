import { router } from "expo-router";
import { Page, T, Button } from "../../components/ui";
export default function Callback() {
  return (
    <Page title="Finishing sign-in">
      <T kind="title">Back in your space.</T>
      <T>
        Return to your account to check sign-in. If sign-in did not complete,
        try again from the app.
      </T>
      <Button
        title="Open my account"
        onPress={() => router.replace("/settings")}
      />
    </Page>
  );
}
