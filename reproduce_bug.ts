
import { parseFileContent } from './src/lib/fileParser';

const testContent = `
主题: 科技
Q: Do you like robots?
A: Yes, they are cool.
T: 你喜欢机器人吗？是的。
V: robots - 机器人

主题: 故乡
Q: Where is your hometown?
A: It is in Beijing.
T: 你的故乡在哪里？在北京。
`;

const result = parseFileContent(testContent);
console.log(JSON.stringify(result, null, 2));

if (result.qaPairs.length === 2 && result.qaPairs[1].category === '故乡') {
  console.log('Test Passed!');
} else {
  console.log('Test Failed!');
  console.log('Second item category:', result.qaPairs[1]?.category);
}
