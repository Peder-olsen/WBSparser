export default class ThrottledPromise {
    output = [];
    queue = [];

    MAX_PR_MIN = 0; // 0 = Unlimited
    CURR_PR_MIN = 0;

    MAX_OPEN = 5;
    CURR_OPEN = 0;

    endPromise = null;

    constructor(limit = 5, timeLimit = 0)
    {
        this.MAX_OPEN = limit;
        this.MAX_PR_MIN = timeLimit;
        setInterval(() => {
            this.CURR_PR_MIN = 0;
            this.restartThreads();
        }, 1000 * 60);
    }

    add(promise)
    {
        this.queue.push(promise);
        return promise;
    }

    restartThreads()
    {
        while(this.CURR_OPEN < this.MAX_OPEN && this.CURR_OPEN < this.queue.length)
        {
            this.CURR_OPEN++;
            const curr = this.queue.shift();
            curr().then((data) => this.queueTick(data));
        }
    }

    start()
    {
        this.restartThreads();
        return new Promise(r => this.endPromise = r);
    }

    queueTick(data)
    {
        this.CURR_PR_MIN++;
        this.output.push(data);
        if(this.queue.length === 0)
        {
            this.CURR_OPEN--;
            if(this.CURR_OPEN === 0)
            {
                this.endPromise(this.output);
                this.output = [];
            }
        }else{
            if(this.MAX_PR_MIN === 0 || this.CURR_PR_MIN < this.MAX_PR_MIN)
            {
                const curr = this.queue.shift();
                curr().then((data) => this.queueTick(data));
            }else{
                console.log("THrottling..");
                this.CURR_OPEN--;
            }
        }
    }


}