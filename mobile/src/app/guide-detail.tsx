import { useLocalSearchParams } from "expo-router";
import { GuideDetail } from "../components/GuideScreens";
export default function Screen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GuideDetail id={id} />;
}
