import { useLocalSearchParams } from "expo-router";
import { RequestDetail } from "../components/RequestScreens";
export default function Screen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RequestDetail id={id} />;
}
