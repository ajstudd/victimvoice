import {useLocalSearchParams} from 'expo-router';
import {ResponderCase} from '../components/ResponderScreens';
export default function Case(){const {id}=useLocalSearchParams<{id:string}>();return <ResponderCase id={id}/>;}
