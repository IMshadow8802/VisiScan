import { View } from 'react-native';
import { Txt } from '../components/Txt';

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Txt variant="display">VisiScan</Txt>
    </View>
  );
}
