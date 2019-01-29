'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { window, workspace, commands, ExtensionContext  } from 'vscode';
// import * as io from 'socket.io';
// import * as http from 'http';
let ks = require('node-key-sender');
import * as WebSocket from 'websocket';
import * as process from 'process';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

export function activate(context: ExtensionContext) {

    console.log('Congratulations, your extension "craft-test" is now active!');
    
    let crafty = new Crafty();
    let disposable = commands.registerCommand('extension.getCrafty', () => {
        crafty.GetCrafty();
    });

    let disposable2 = commands.registerCommand('extension.setSelect', () => {
        crafty.SetSelect();
    });
    context.subscriptions.push(crafty, disposable2);
    context.subscriptions.push(disposable, disposable2);
}

class Crafty {
    /* ** Variables ** */
    /* ** Variables ** */
    private client!: WebSocket.w3cwebsocket;
    private sessionId = '';
    private sendContextChange = false;
    private crownObjectList: ICrownRootObject[] = [];
    public toolsConfig = 0;
    public controlerConfig = 1;
    private childProcess: any;
    private selectMode = false;
    private ctrlMode = false;
    

    public SetSelect(value: boolean = !this.selectMode) {
        this.selectMode = value;
        window.showInformationMessage('Select mode:' + this.selectMode);
    }

    /* ** Connection ** *
        * Do not call directly
        * This exists as a way to communitcate with manager
        * * Creates query for CrownChangeHandler 
        * * Sends crown overlay changes
    */
    public ConnectWithManager() {
        // create new client
        this.client = new WebSocket.w3cwebsocket('ws://localhost:10134');

        // client error
        this.client.onerror = err => {
            console.error(err.message);
        };
        // client connect
        this.client.onopen = () => {
            console.log('readyState', this.client.readyState);
            if (this.client.readyState === this.client.OPEN) {
                let currentProcessID = process.pid;

                let registerRootObject: CrownRegisterRootObject = new CrownRegisterRootObject();
                registerRootObject.message_type = 'register';
                registerRootObject.plugin_guid = 'c14dcc1e-8717-46d5-aea9-f9251b2f9982';
                registerRootObject.execName = 'Code.exe';
                registerRootObject.PID = currentProcessID;
                let s: string = JSON.stringify(registerRootObject);

                // only connect to active session process
                registerRootObject.PID = process.pid;
                let activeConsoleSessionId: number = process.pid;
                let currentProcessSessionId: number = process.pid;

                // if we are running in active session? //TODO: fix this
                if (currentProcessSessionId === activeConsoleSessionId)
                    this.client.send(s);
                else
                    console.log('Inactive user session. Skipping connect');
            }
        };

        // client close
        this.client.onclose = () => {
            window.showInformationMessage('Crafy client closed');
        };

        // client message
        this.client.onmessage = e => {
            this.MessageHandler(e.data); // handle messages
        };
    }

    private MessageHandler(msg: string) {
        console.log('msg :' + msg + '\n');
        let crownRootObject: ICrownRootObject = JSON.parse(msg);

        if (crownRootObject.message_type == 'crown_turn_event') {
            this.crownObjectList.push(crownRootObject); // send event to query
            console.log('**** UI crown ratchet delta :' + crownRootObject.ratchet_delta + ' slot delta = ' + crownRootObject.delta + '\n');
        }
        else if (crownRootObject.message_type == 'register_ack') {
            // save the session id as this is used for any communication with Logi Options
            window.showInformationMessage('Get Crafty');
            this.sessionId = crownRootObject.session_id;

            if (this.sendContextChange) {
                this.sendContextChange = false;
                switch (this.toolsConfig) {
                    case 0:
                        this.ToolChange('EditorControl');
                        break;
                    case 1:
                        this.ToolChange('EditorControl-noTab');
                        break;
                    default:
                        this.ToolChange('EditorControl');
                        break;
                }
                // Editor Control
            } else
                switch (this.toolsConfig) {
                    case 0:
                        this.ToolChange('EditorControl');
                        break;
                    case 1:
                        this.ToolChange('EditorControl-noTab');
                        break;
                    default:
                        this.ToolChange('EditorControl');
                        break;
                }
        }
    }
    public ToolChange(contextName: string) {
        try {
            let toolChangeObject: ToolChangeObject = new ToolChangeObject();
            toolChangeObject.message_type = 'tool_change';
            toolChangeObject.session_id = this.sessionId;
            toolChangeObject.tool_id = contextName;

            let s: string = JSON.stringify(toolChangeObject);
            this.client.send(s);
        } catch (ex) {
            let err = ex.message;
            console.error(err);
        }
    }
    
    /* ** Init ** */
    public GetCrafty() {
        console.log(workspace.getConfiguration('craft'));
        
        let config = workspace.getConfiguration('craft');
        if (config.disableTabControl) this.toolsConfig = 1;
        console.log(config.disableTabControl);
        let controlerConfig: 'none' | 'java' | 'keysender' = config.controllerMethod;
        this.controlerConfig = ControlerConfigurations[controlerConfig];
        console.log(this.controlerConfig);

        switch (this.controlerConfig) {
            case 0:
                
            case 1:
                var exec = require('child_process').exec;
                this.childProcess = exec('java -jar C:\\Users\\DreiP\\source\\repos\\vsc_ext\\crafty\\src\\resources\\key-listener\\key-listener\\target\\key-listener-0.1-jar-with-dependencies.jar',
                    (error: any, stdout: any, stderr: any) => {
                        if (error !== null) {
                            window.showErrorMessage('Could not execute key listener.');
                            window.showWarningMessage('Switching to basic controls');
                            return;
                        }
                    });
                this.childProcess.stdout.on('data', (data: any) => {
                    switch (data) {
                        case '0':
                            this.selectMode = true;
                            break;
                        case '1':
                            this.ctrlMode = true;
                            break;
                        case '2':
                            this.selectMode = false;
                            break;
                        case '3':
                            this.ctrlMode = false;
                            break;
                        default:
                            this.selectMode = false;
                            this.ctrlMode = false;
                    }
                });
                break;
        }
        // */
        try {
            // setup timers 
            this.SetupUIRefreshTimer();

            // setup connnection 
            this.ConnectWithManager();
        }
        catch (ex) {
            let str: string = ex.message;
            console.error(str);
        }
    }

    /* ** Timers ** 
        * The controlers for all that happens
    */
    // Initial Timer Start
    private SetupUIRefreshTimer() {
        // constant timer to check for craft events sent by socket connection
        let updateTimer = () => {
            setTimeout(() => {
                this.CrownChangeHandler();
                updateTimer();
            }, 70);
        };
        updateTimer();
        // timer to prevent disconnect
        let connectionTimer = () => {
            setTimeout(() => {
                if (this.client.readyState !== this.client.OPEN) {
                    // client = null;
                    this.ConnectWithManager();
                    connectionTimer();
                }
            }, 30000);
        };
        connectionTimer();
    }
    private CrownChangeHandler() {
        try {
            // set value to build query
            let totalDeltaValue = 0;
            let totalRatchetDeltaValue = 0;
            // check query
            if (this.crownObjectList === null || this.crownObjectList.length === 0)
                return; // return if event query is empty
            let currentToolOption: string = this.crownObjectList[0].task_options.current_tool_option;
            console.log('currentToolOption is: ' + currentToolOption + '\n');

            let crownRootObject: ICrownRootObject = this.crownObjectList[0];
            for (let i = 0; i < this.crownObjectList.length; i++)
                if (currentToolOption === this.crownObjectList[i].task_options.current_tool_option) {
                    totalDeltaValue = totalDeltaValue + this.crownObjectList[i].delta;
                    totalRatchetDeltaValue = totalRatchetDeltaValue + this.crownObjectList[i].ratchet_delta;
                } else break; // does not perform actions before tool change

            if (this.crownObjectList.length >= 1) {
                this.crownObjectList = []; // empty query

                crownRootObject.delta = totalDeltaValue;
                crownRootObject.ratchet_delta = totalRatchetDeltaValue;

                // console.log('Ratchet delta is :' + totalRatchetDeltaValue + '\n');
                this.HandleUpdates(crownRootObject); // send query
            }
        }
        catch (ex) {
            let str: string = ex.message;
            console.error(str);
        }
    }

    public HandleUpdates = (crownRootObject: ICrownRootObject) => {
        if (crownRootObject.message_type == 'deactivate_plugin')
            return;
        try {
            if (crownRootObject.message_type == 'crown_turn_event' && crownRootObject.delta != 0) {
                // received a crown turn event from crown
                console.log('++ crown ratchet delta :' + crownRootObject.ratchet_delta + ' slot delta = ' + crownRootObject.delta + '\n');
                let rDelta = crownRootObject.delta > 0;
                switch (crownRootObject.task_options.current_tool_option) {
                    case 'tabControl':
                        let tabName = 'Unnamed Tab';
                        if (crownRootObject.delta > 0)
                            commands.executeCommand('workbench.action.nextEditor').then(() => {
                                if (window.activeTextEditor)
                                    tabName = window.activeTextEditor.document.fileName;
                            });
                        else if (crownRootObject.delta < 0)
                            commands.executeCommand('workbench.action.previousEditor').then(() => {
                                if (window.activeTextEditor)
                                    tabName = window.activeTextEditor.document.fileName;
                            });
                        this.ReportToolOptionDataValueChange(crownRootObject.task_options.current_tool, 'quickLayout', tabName);
                        break;
                    case 'columnControl':
                        if (window.activeTextEditor) {
                            switch (this.ctrlMode) {
                                case false:
                                    commands.executeCommand('cursorMove', { 'to': 'right', 'by': 'character', 'value': crownRootObject.ratchet_delta, 'select': this.selectMode });
                                    break;
                                case this.selectMode:
                                    if (rDelta) commands.executeCommand('cursorWordEndRightSelect');
                                    else commands.executeCommand('cursorWordStartLeftSelect');
                                    break;
                                case true:
                                    if (rDelta) commands.executeCommand('cursorWordEndRight');
                                    else commands.executeCommand('cursorWordStartLeft');
                                    break;
                            }
                            this.ReportToolOptionDataValueChange(crownRootObject.task_options.current_tool, 'quickLayout', window.activeTextEditor.selection.active.character.toString());
                        }
                        /*
                        if (crownRootObject.ratchet_delta > 0)
                            ks.sendKey('right');
                        else if (crownRootObject.ratchet_delta < 0)
                            ks.sendKey('v');      
                        }
                        */
                        break;
                    case 'lineControl':
                        if (window.activeTextEditor) {
                            if (this.ctrlMode)
                                commands.executeCommand('editorScroll', { 'to': 'down', 'by': 'line', 'value': crownRootObject.ratchet_delta });
                            else 
                                commands.executeCommand('cursorMove', { 'to': 'down', 'by': 'line', 'value': crownRootObject.ratchet_delta, 'select': this.selectMode });
                            this.ReportToolOptionDataValueChange(crownRootObject.task_options.current_tool, 'quickLayout', window.activeTextEditor.selection.active.line.toString());
                        }   
                        break;
                    default: break;
                }
            }
        } catch (ex) {
            let str: string = ex.message;
            console.error(str);
        }
    }
    private ReportToolOptionDataValueChange(tool: string, toolOption: string, value: string) {
        let toolUpdateRootObject: ToolUpdateRootObject = new ToolUpdateRootObject();
        toolUpdateRootObject = {
            tool_id: tool,
            message_type: 'tool_update',
            session_id: this.sessionId,
            show_overlay: 'true',
            tool_options: new Array<ToolOption>(new ToolOption(toolOption, value))
        };

        let s: string = JSON.stringify(toolUpdateRootObject);
        this.client.send(s);

        console.log(`MyWebSocket.ReportToolOptionDataValueChange - Tool:${tool}, Tool option:${toolOption}, Value:${value}`);
    }

    dispose() {
        if (this.controlerConfig == 1) {
            this.childProcess.kill();
            this.childProcess.disconnect();
        }
    }
}

class CrownRegisterRootObject {
    message_type!: string;
    plugin_guid!: string;
    session_id!: string;
    PID!: number;
    execName!: string;
}
class TaskOptions {
    current_tool!: string;
    current_tool_option!: string;
}
interface ICrownRootObject {
    message_type: string;
    device_id: number;
    unit_id: number;
    feature_id: number;
    task_id: string;
    session_id: string;
    touch_state: string;
    task_options: TaskOptions;
    delta: number;
    ratchet_delta: number;
    time_stamp: number;
    state: string;
}
class ToolUpdateRootObject {
    message_type!: string;
    session_id!: string;
    show_overlay!: string;
    tool_id!: string;
    tool_options!: ToolOption[];
    play_task?: string;
    /* constructor(
        public message_type: string,
        public session_id: string,
        public show_overlay: string,
        public tool_id: string,
        public tool_options: IToolOption[],
        public play_task: string
    ) { } */
}
class ToolOption {
    constructor(public name: string, public value: string) { }
}
class ToolChangeObject {
    message_type!: string;
    session_id!: string;
    tool_id!: string;
}
enum ControlerConfigurations { 'none' = 0, 'java', 'keysender'}