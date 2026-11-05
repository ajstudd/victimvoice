import { useLocalSearchParams } from "expo-router";
import { ContactForm } from "../components/HomeScreens";
export default function Contact() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ContactForm id={id} />;
}
