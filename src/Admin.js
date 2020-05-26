import React, {useCallback, useState} from 'react';
import {makeStyles} from '@material-ui/core/styles';
import {useDispatch, useSelector} from "react-redux";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import CardActions from "@material-ui/core/CardActions";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import TextField from "@material-ui/core/TextField";
import DialogActions from "@material-ui/core/DialogActions";
import {connect, setAdminAuthenticated, transceive} from "./actions";
import {byteToHexString} from "./util";
import {useSnackbar} from "notistack";
import ButtonGroup from "@material-ui/core/ButtonGroup";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  card: {
    marginLeft: "10%",
    marginRight: "10%",
    marginTop: "30px",
  },
  buttonGroup: {
    marginLeft: "20px"
  }
}));

/* eslint-disable no-throw-literal */
export default function Overview() {
  const classes = useStyles();
  const device = useSelector(state => state.device);
  const dispatch = useDispatch();
  const authenticated = useSelector(state => state.adminAuthenticated);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [flashSpace, setFlashSpace] = useState('unknown');
  const {enqueueSnackbar} = useSnackbar();

  const onAuthenticate = useCallback(() => {
    setPinDialogOpen(true);
  }, []);


  const selectAdminApplet = useCallback(async () => {
    if (device === null) {
      if (!await dispatch(connect())) {
        throw 'Cannot connect to Canokey';
      }
    }

    let res = await dispatch(transceive("00A4040005F000000000"));
    if (!res.endsWith("9000")) {
      throw 'Selecting admin applet failed';
    }
  }, [device, dispatch]);

  const adminTransceive = useCallback(async (capdu, success_msg, failed_msg, secret) => {
    try {
      await selectAdminApplet();
      let res = await dispatch(transceive(capdu, secret));
      if (res.endsWith("9000")) {
        enqueueSnackbar(success_msg, {variant: 'success'});
        return true;
      } else {
        enqueueSnackbar(failed_msg, {variant: 'error'});
      }
    } catch (err) {
      enqueueSnackbar(err.toString(), {variant: 'error'});
    }
    return false;
  }, [dispatch, selectAdminApplet, enqueueSnackbar]);

  const doAuthenticate = useCallback(async () => {
    setPinDialogOpen(false);
    try {
      let array = new TextEncoder().encode(pin);
      let len = new Uint8Array([array.length]);
      await selectAdminApplet();
      let res = await dispatch(transceive(`00200000${byteToHexString(len)}${byteToHexString(array)}`, true));
      if (res.startsWith("63C")) {
        let retry = parseInt(res.substr(3, 1), 16);
        enqueueSnackbar(`PIN verification failed, ${retry} retires left`, {variant: 'error'});
      } else if (res.endsWith("9000")) {
        dispatch(setAdminAuthenticated(true));
        enqueueSnackbar('PIN verification success', {variant: 'success'});
        res = await dispatch(transceive("0041000000"));
        if (res.endsWith("9000")) {
          let free = parseInt(res.substring(0, 2), 16);
          let total = parseInt(res.substring(2, 4), 16);
          setFlashSpace(`free: ${free} KiB, total ${total} KiB`);
        }
      } else {
        enqueueSnackbar('PIN verification failed', {variant: 'error'});
      }
    } catch (err) {
      enqueueSnackbar(err.toString(), {variant: 'error'});
    }
  }, [pin, dispatch, enqueueSnackbar, selectAdminApplet]);

  const onKeyPress = useCallback(async (e) => {
    if (e.key === 'Enter') {
      await doAuthenticate();
    }
  }, [doAuthenticate]);

  const setLedOn = useCallback(async () => {
    await adminTransceive("00400101", "LED is on", "Set LED status failed");
  }, [adminTransceive]);

  const setLedOff = useCallback(async () => {
    await adminTransceive("00400100", "LED is off", "Set LED status failed");
  }, [adminTransceive]);

  const setHotpOn = useCallback(async () => {
    await adminTransceive("00400301", "HOTP on touch is on", "Set HOTP status failed");
  }, [adminTransceive]);

  const setHotpOff = useCallback(async () => {
    await adminTransceive("00400300", "HOTP on touch is off", "Set HOTP status failed");
  }, [adminTransceive]);

  const resetOpenPGP = useCallback(async () => {
    await adminTransceive("00030000", "Reset OpenPGP done", "Reset OpenPGP failed");
  }, [adminTransceive]);

  const resetPIV = useCallback(async () => {
    await adminTransceive("00040000", "Reset PIV done", "Reset PIV failed");
  }, [adminTransceive]);

  const resetOATH = useCallback(async () => {
    await adminTransceive("00050000", "Reset OATH done", "Reset OATH failed");
  }, [adminTransceive]);

  const enterDFU = useCallback(async () => {
    await adminTransceive("00FF2222", "Enter DFU: Unexpected success",
      "Enter DFU: WebUSB disconnected, device should be in DFU now");
  }, [adminTransceive]);

  return (
    <div className={classes.root}>
      <Card className={classes.card}>
        <CardContent>
          <Typography variant="h3">
            Admin Applet
          </Typography>
          <Typography>
            Authenticated: {authenticated ? 'true' : 'false'}
          </Typography>
          <Typography>
            Flash space info: {flashSpace}
          </Typography>
        </CardContent>
        <CardActions>
          <Button onClick={onAuthenticate} variant="contained">
            Authenticate
          </Button>
        </CardActions>
      </Card>
      {
        authenticated ?
          <div>
            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h3">
                  Config
                </Typography>
                <Typography variant="h6">
                  LED:
                  <ButtonGroup variant="contained" className={classes.buttonGroup}>
                    <Button onClick={setLedOn}>ON</Button>
                    <Button onClick={setLedOff}>OFF</Button>
                  </ButtonGroup>
                </Typography>
                <Typography variant="h6">
                  HOTP on touch:
                  <ButtonGroup variant="contained" className={classes.buttonGroup}>
                    <Button onClick={setHotpOn}>ON</Button>
                    <Button onClick={setHotpOff}>OFF</Button>
                  </ButtonGroup>
                </Typography>
                <Button onClick={enterDFU}>Enter DFU (development only)</Button>
              </CardContent>
            </Card>
            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h3">
                  Reset Applet
                </Typography>
              </CardContent>
              <CardActions>
                <Button onClick={resetOpenPGP} variant="contained">Reset OpenPGP</Button>
                <Button onClick={resetPIV} variant="contained">Reset PIV</Button>
                <Button onClick={resetOATH} variant="contained">Reset OATH</Button>
              </CardActions>
            </Card>
          </div>
          : null
      }
      <Dialog open={pinDialogOpen} onClose={() => setPinDialogOpen(false)}>
        <DialogTitle> Enter PIN to Authenticate Admin Applet</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter PIN below. Please be aware of PIN retry count. This will not be stored in browser.
          </DialogContentText>
          <TextField
            type="password"
            autoFocus
            fullWidth
            onKeyPress={onKeyPress}
            onChange={(e) => setPin(e.target.value)}/>
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={doAuthenticate}>
            Authenticate
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
