

export function hhmmss() {
    let now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    let ampm = hours >= 12? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours? hours : 12;
    hours = hours.toString().padStart(2, '0');
    minutes = minutes.toString().padStart(2, '0');
    seconds = seconds.toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds} ${ampm}`;
}

export function hhmm() {
  let now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  hours = hours % 12;
  hours = hours? hours : 12;
  hours = hours.toString().padStart(2, '0');
  minutes = minutes.toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function ddmmmtttt() {
  const options = { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
  const formattedDate = new Date().toLocaleString('en-US', options);
  return formattedDate.replace(',', ''); // Remove the comma for the desired format
}

export function hasText(str) {
    const fullAlphabetArray = [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'];
    for (let char of str) {
      if (fullAlphabetArray.includes(char)) {
        return true;
      }
    }
    return false;
  }

  export function randStr(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  }


