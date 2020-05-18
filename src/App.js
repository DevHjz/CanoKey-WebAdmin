import React, {useState, useCallback, useEffect} from 'react';
import {makeStyles} from '@material-ui/core/styles';
import logo from './logo.png';
import {
  Toolbar,
  AppBar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Collapse,
} from '@material-ui/core';
import {Route, Switch, useHistory} from 'react-router-dom';
import {useSelector, useDispatch} from 'react-redux';
import MenuIcon from '@material-ui/icons/Menu';
import HomeIcon from '@material-ui/icons/Home';
import AppsIcon from '@material-ui/icons/Apps';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import SyncAltIcon from '@material-ui/icons/SyncAlt';
import {connect, disconnect} from './actions';
import Overview from './Overview';
import Admin from "./Admin";
import Apdu from "./Apdu";
import Oath from "./Oath";
import {useSnackbar} from "notistack";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  title: {
    flexGrow: 1,
  },
  icon: {
    paddingLeft: "20px",
    paddingTop: "10px",
    paddingBottom: "10px",
    width: "70%",
  },
  nested: {
    paddingLeft: theme.spacing(5),
  },
}));

export default function App() {
  const classes = useStyles();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [appletOpen, setAppletOpen] = useState(true);
  const dispatch = useDispatch();
  const history = useHistory();
  const device = useSelector(state => state.device);
  const [compatible, setCompatible] = useState(true);
  const {enqueueSnackbar} = useSnackbar();

  useEffect(() => {
    if (navigator.usb === undefined) {
      setCompatible(false);
      enqueueSnackbar('Your browser does not support WebUSB, please use new versions of Chrome/Chromium/Edge/Opera.',
        {variant: "error"});
    } else {
      enqueueSnackbar('Your browser supports WebUSB, and you are good to go!',
        {variant: "success"});
    }
  }, []);


  const showOverview = useCallback(e => {
    setDrawerOpen(false);
    history.push('/');
  }, [history]);

  const showAdmin = useCallback(e => {
    setDrawerOpen(false);
    history.push('/admin');
  }, [history]);

  const showAPDU = useCallback(e => {
    setDrawerOpen(false);
    history.push('/apdu');
  }, [history]);

  const showOATH = useCallback(e => {
    setDrawerOpen(false);
    history.push('/oath');
  }, [history]);

  return (
    <div className={classes.root}>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" aria-label="menu" onClick={() => setDrawerOpen(true)}>
            <MenuIcon/>
          </IconButton>
          <Typography variant="h6" className={classes.title}>
            CanoKey Web Console
          </Typography>
          {
            device ?
              <Button variant="contained" onClick={() => dispatch(disconnect())}>
                Disconnect
              </Button> :
              <Button variant="contained" onClick={() => dispatch(connect())}>
                Connect
              </Button>
          }
        </Toolbar>
      </AppBar>
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}>
        <img src={logo} alt="logo" className={classes.icon}/>
        <List>
          <Divider/>
          <ListItem button onClick={showOverview}>
            <ListItemIcon><HomeIcon/></ListItemIcon>
            <ListItemText>Overview</ListItemText>
          </ListItem>
          <ListItem button onClick={() => setAppletOpen(!appletOpen)}>
            <ListItemIcon><AppsIcon/></ListItemIcon>
            <ListItemText>Applets</ListItemText>
            {appletOpen ? <ExpandLessIcon/> : <ExpandMoreIcon/>}
          </ListItem>
          <Collapse in={appletOpen}>
            <List>
              <ListItem button onClick={showAdmin} className={classes.nested}>
                <ListItemIcon><ArrowForwardIcon/></ListItemIcon>
                <ListItemText>Admin</ListItemText>
              </ListItem>
              <ListItem button onClick={showOATH} className={classes.nested}>
                <ListItemIcon><ArrowForwardIcon/></ListItemIcon>
                <ListItemText>OATH</ListItemText>
              </ListItem>
              <ListItem button className={classes.nested}>
                <ListItemIcon><ArrowForwardIcon/></ListItemIcon>
                <ListItemText>OpenPGP</ListItemText>
              </ListItem>
              <ListItem button className={classes.nested}>
                <ListItemIcon><ArrowForwardIcon/></ListItemIcon>
                <ListItemText>PIV</ListItemText>
              </ListItem>
            </List>
          </Collapse>
          <ListItem button onClick={showAPDU}>
            <ListItemIcon><SyncAltIcon/></ListItemIcon>
            <ListItemText>APDU Console & History</ListItemText>
          </ListItem>
        </List>
      </Drawer>

      <Switch>
        <Route path="/" exact component={Overview}/>
        <Route path="/admin" exact component={Admin}/>
        <Route path="/apdu" exact component={Apdu}/>
        <Route path="/oath" exact component={Oath}/>
      </Switch>
    </div>
  );
}
