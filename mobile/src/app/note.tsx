import { useLocalSearchParams } from "expo-router";
import { NoteEditor } from "../components/SpaceScreens";
export default function Screen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <NoteEditor id={id} />;
}
