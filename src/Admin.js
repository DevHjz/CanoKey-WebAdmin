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
import Alert from "@material-ui/core/DialogContentText";
import TextField from "@material-ui/core/TextField";
import DialogActions from "@material-ui/core/DialogActions";
import {connect, transceive} from "./actions";
import {byteToHexString} from "./util";
import Snackbar from "@material-ui/core/Snackbar";
import {useSnackbar} from "notistack";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  card: {
    marginLeft: "10%",
    marginRight: "10%",
    marginTop: "30px",
  }
}));

export default function Overview() {
  const classes = useStyles();
  const device = useSelector(state => state.device);
  const dispatch = useDispatch();
  const [authenticated, setAuthenticated] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pin, setPin] = useState('');
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
      enqueueSnackbar(err, {variant: 'error'});
    }
    return false;
  }, [dispatch, selectAdminApplet]);

  const doAuthenticate = useCallback(async () => {
    setPinDialogOpen(false);
    let array = new TextEncoder().encode(pin);
    let len = new Uint8Array([array.length]);
    try {
      await selectAdminApplet();
      let res = await dispatch(transceive(`00200000${byteToHexString(len)}${byteToHexString(array)}`, true));
      if (res.startsWith("63C")) {
        let retry = parseInt(res.substr(3, 1), 16);
        enqueueSnackbar(`PIN verification failed, ${retry} retires left`, {variant: 'error'});
      } else if (res.endsWith("9000")) {
        enqueueSnackbar('PIN verification success', {variant: 'success'});
      } else {
        enqueueSnackbar('PIN verification failed', {variant: 'error'});
      }
    } catch (err) {
      enqueueSnackbar(err, {variant: 'error'});
    }
  }, [pin, adminTransceive]);

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
    await adminTransceive("00400301", "HOTP on touch is off", "Set HOTP status failed");
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

  return (
    <div className={classes.root}>
      <Card className={classes.card}>
        <CardContent>
          <Typography variant="h2">
            Admin Applet
          </Typography>
          <Typography>
            Authenticated: {authenticated ? 'true' : 'false'}
          </Typography>
        </CardContent>
        <CardActions>
          <Button onClick={onAuthenticate}>
            Authenticate
          </Button>
        </CardActions>
      </Card>
      {
        authenticated ?
          <div>
            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h2">
                  Config
                </Typography>
                <Typography>
                  LED:
                  <Button onClick={setLedOn}>ON</Button>
                  <Button onClick={setLedOff}>OFF</Button>
                </Typography>
                <Typography>
                  HOTP on touch:
                  <Button onClick={setHotpOn}>ON</Button>
                  <Button onClick={setHotpOff}>OFF</Button>
                </Typography>
              </CardContent>
            </Card>
            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h2">
                  Reset Applet
                </Typography>
              </CardContent>
              <CardActions>
                <Button onClick={resetOpenPGP}>Reset OpenPGP</Button>
                <Button onClick={resetPIV}>Reset PIV</Button>
                <Button onClick={resetOATH}>Reset OATH</Button>
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
