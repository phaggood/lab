var camapp = angular.module('camapp', ["angular-carousel","ui.router","LocalStorageModule","webcam"]);
camapp.config(function($stateProvider, $urlRouterProvider){

    // For any unmatched url, send to /route1
    $urlRouterProvider.otherwise("camera")

    $stateProvider
        .state('camera', {
            url: "/camera",
            templateUrl: "partials/camerapage.html",
            controller: "CameraCtl"
        })

        .state('camera.add', {
            url: "/add",
            templateUrl: "partials/gallery_add.html",
            controller: "GalleryCtl"

        })
        .state('gallery', {
            url: "/gallery",
            templateUrl: "partials/gallery_list.html",
            controller: "GalleryCtl"

        })
        .state('gallery.clear', {
            url: "/delete",
            templateUrl: "partials/gallery_delete.html",
            controller: "GalleryCtl"
        })
        .state('photoView', {
            url: "/view/:id",
            templateUrl: "partials/gallery_showPicture.html",
            controller: "GalleryPictureCtl"
        })
});

camapp.controller('CameraCtl', function($scope, $stateParams, GalleryService) { // }, $stateParams) { //},localStorageService){
    var _video = null,  patData = null;

    $scope.newPic =  {};
    $scope.cameraReady = false;
    $scope.webcamError = false;
    $scope.patOpts = {x: 0, y: 0, w: 25, h: 25};
    $scope.hasGallery = false;
    $scope.picReady = false;
    $scope.galleryCount = 0;

    function onFailure(err) {
        alert("The following error occured: " + err.name);
        $scope.cameraReady = false;
    }

    var getVideoData = function getVideoData(x, y, w, h) {
        var hiddenCanvas = document.createElement('canvas');
        hiddenCanvas.width = _video.width;
        hiddenCanvas.height = _video.height;
        var ctx = hiddenCanvas.getContext('2d');
        ctx.drawImage(_video, 0, 0, _video.width, _video.height);
        return ctx.getImageData(x, y, w, h);
    };

    // init camera from callbacks
    $scope.onError = function (err) {
        $scope.$apply(
            function() {
                $scope.webcamError = err;
            }
        );
    };

    // callback on webcam instantiation
    $scope.onSuccess = function (videoElem) {
        // The video element contains the captured camera data
        _video = videoElem;
        $scope.$apply(function() {
            $scope.patOpts.w = _video.width;
            $scope.patOpts.h = _video.height;
            $scope.cameraReady = true;
            $scope.picReady = false;
            $scope.galleryCount = GalleryService.getPics().length;
            $scope.hasGallery = ($scope.galleryCount > 0);
        });
    };


    // copy webcam (video) to canvas and make copy
    $scope.takePicture = function() {
        if (_video) {
            var patCanvas = document.querySelector('#snapshot');
            if (!patCanvas) return;    // need to create dynamic canvas then copy to
                                       // visible so I can use states to display image
                                       // rather than div hiding

            patCanvas.width = _video.width;
            patCanvas.height = _video.height;
            var ctxPat = patCanvas.getContext('2d');

            // manipulatable binary data
            var idata = getVideoData($scope.patOpts.x, $scope.patOpts.y, $scope.patOpts.w, $scope.patOpts.h);
            ctxPat.putImageData(idata, 0, 0);

            // save pic
            $scope.newPic.pic = patCanvas.toDataURL('image/png');
            $scope.newPic.date = new Date();
            $scope.newPic.id = -1;
            $scope.picReady = true;
        }
    };

    $scope.addToGallery = function() {
        var result = GalleryService.addPic($scope.newPic);
        if (result) {
            console.log("item added");
            $scope.hasGallery = true;
        } else {
            $scope.hasGallery = (GalleryService.galleryCount() > 0);
            console.log("additem failed");
        }
        $scope.newPic = {};
        $scope.picReady = false;
        $scope.galleryCount++;

    };
});

camapp.controller('GalleryCtl', function($scope, $stateParams,$state, GalleryService) { // }, $stateParams) { //},localStorageService){
    $scope.gallery = [];
    // init controller by getting list of pics
    $scope.getPic = function() {
        console.log("Getting pic " + $stateParams.id);
        $scope.data.pic = GalleryService.getPic($stateParams.id);
        console.log("Found pic " + $scope.data.pic.name);
    };

    // init controller by getting list of pics
    $scope.getPics = function() {
        $scope.gallery = GalleryService.getPics();
    };

    $scope.deleteGallery = function() {
        GalleryService.purgeGallery();
        $state.go("camera");
    }

    $scope.cancelDeleteGallery = function() {
        $state.go("gallery");
    }

    $scope.deletePic = function() {
        GalleryService.removePic($scope.data.pic);
        $scope.data.pics = GalleryService.getPics();
        $state.go('gallery');
    };

    // init controller by getting a pic by $stateParams.id
    $scope.getPics();
});


camapp.controller('GalleryPictureCtl', function($scope, $stateParams,$state, GalleryService) { // }, $stateParams) { //},localStorageService){
    $scope.galleryPicture = {};
    // init controller by getting list of pics
    $scope.getPic = function() {

        $scope.galleryPicture = GalleryService.getPic($stateParams.id);
        console.log("Found pic " + $scope.galleryPicture.id);
    };

    // init controller by getting a pic by $stateParams.id
    $scope.getPic();
});

camapp.factory("GalleryService", function(localStorageService) {

    var gallerySize = 0;

    var svc = {};

    // return all pictures from localstorage
    svc.getPics = function() {
        var pics =  localStorageService.get('pics');
        if (pics != null ) { gallerySize = pics.length; }
        return pics;
    };

    svc.galleryCount = function() {
        return gallerySize;
    };

    // insert new pic into storage
    svc.addPic = function(newPic){
        var picsize = 0;
        var newArray = localStorageService.get('pics') ;
        var oldSize = 0;
        if (newArray == null) {
            newArray = [];
        } else {
            oldSize = newArray.length;
        }
        localStorageService.clearAll();
        newPic.id = newArray.length + 1;
        console.log("exporting pic on " + newPic.date)
        newArray.push(newPic);
        var result = localStorageService.add('pics',newArray);
        return (oldSize < newArray.length);
    };

    // return selected pic from storage
    svc.getPic = function(id) {
        var selectedPic = {}
        var pics = localStorageService.get("pics");
        if ((pics != null) && ( id <= pics.length )) {
            selectedPic = pics[id - 1];
        }
        return selectedPic;
    };


    svc.updatePic = function(pic) {
        var pics = localStorageService.get('pics');
        pics.pop(pic.id);
        pics.push(pic);
        localStorageService.put("pics",pics);
        console.log("Image updated");
    };

    svc.addComment = function(id, text){
        var comments = localStorageService.get("comments");
        if (comments == null) comments = [];
        commentSet = comments[id];
        //commentSet.push(text)
        // localStorageService.put("commnets",commntSet)
        // console.log("Comments saved"
    };

    // empty storage
    svc.purgeGallery = function() {
        localStorageService.clearAll();
        gallerySize = 0;
        console.log("Gallery cleared");
    };
    svc.removePic = function(id) {};
    return svc;

});