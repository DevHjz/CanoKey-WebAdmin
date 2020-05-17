import {byteToHexString, hexStringToByte, sleep} from "./util";

export const TYPES = {
  SET_DEVICE: Symbol('SET_DEVICE'),
  APPEND_APDU_LOG: Symbol('APPEND_APDU_LOG'),
}

export function setDevice(device) {
  return {
    type: TYPES.SET_DEVICE,
    device
  }
}

export function connect() {
  return async dispatch => {
    let device = await navigator.usb.requestDevice({
      filters: [{
        classCode: 0xFF, // vendor specific
      }]
    });
    if (device !== undefined) {
      await device.open();
      await device.claimInterface(1);
      dispatch(setDevice(device));
      return true;
    }
    return false;
  };
}

export function disconnect() {
  return {
    type: TYPES.SET_DEVICE,
    device: null
  }
}

export function appendAPDULog(capdu, rapdu) {
  return {
    type: TYPES.APPEND_APDU_LOG,
    capdu,
    rapdu
  }
}


async function transceive_webusb(device, capdu) {
  let data = hexStringToByte(capdu);

  // send a command
  await device.controlTransferOut({
    requestType: 'vendor',
    recipient: 'interface',
    request: 0,
    value: 0,
    index: 1
  }, data);
  // wait for execution
  while (1) {
    let resp = await device.controlTransferIn({
      requestType: 'vendor',
      recipient: 'interface',
      request: 2,
      value: 0,
      index: 1
    }, 1);
    if (new Uint8Array(resp.data.buffer)[0] === 0) break;
    await sleep(100);
  }
  // get the response
  let resp = await device.controlTransferIn({
    requestType: 'vendor',
    recipient: 'interface',
    request: 1,
    value: 0,
    index: 1
  }, 1500);
  if (resp.status === "ok")
    return byteToHexString(new Uint8Array(resp.data.buffer));
  return '';
}

export function transceive(capdu, is_secret) {
  return async (dispatch, getState) => {
    const {device} = getState();
    try {
      let res = await transceive_webusb(device, capdu);
      if (is_secret) {
        dispatch(appendAPDULog('REDACTED', res));
      } else {
        dispatch(appendAPDULog(capdu, res));
      }
      return res;
    } catch (err) {
      console.log(err);
    }
    return '';
  };
}
